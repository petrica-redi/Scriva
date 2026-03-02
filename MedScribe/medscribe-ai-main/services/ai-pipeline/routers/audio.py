"""WebSocket endpoint for real-time audio transcription."""

import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from deepgram import DeepgramClient, LiveOptions, LiveTranscriptionEvents

from models.config import get_settings
from utils.auth import verify_token_string
from utils.logging import get_logger

router = APIRouter()
logger = get_logger("audio")


@router.websocket("/transcribe")
async def transcribe_audio(websocket: WebSocket):
    """
    WebSocket endpoint for streaming audio transcription.

    Flow:
    1. Client connects with auth token in query params
    2. Opens Deepgram streaming connection
    3. Receives audio chunks from client, forwards to Deepgram
    4. Receives transcript results from Deepgram, forwards to client
    5. On disconnect, cleans up all connections and buffers
    """
    token = websocket.query_params.get("token")

    if not token:
        auth_header = websocket.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    if not token:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    try:
        auth = verify_token_string(token)
    except Exception:
        await websocket.close(code=4401, reason="Unauthorized")
        return

    await websocket.accept()

    settings = get_settings()
    deepgram_connection = None

    try:
        deepgram = DeepgramClient(settings.deepgram_api_key)
        deepgram_connection = deepgram.listen.asyncwebsocket.v("1")

        async def on_message(self, result, **kwargs):
            try:
                sentence = result.channel.alternatives[0]
                if not sentence.transcript:
                    return

                speaker = 0
                if hasattr(sentence, "words") and sentence.words:
                    speaker = getattr(sentence.words[0], "speaker", 0)

                msg = {
                    "type": "transcript",
                    "speaker": speaker,
                    "text": sentence.transcript,
                    "is_final": result.is_final,
                    "confidence": sentence.confidence,
                    "timestamp": result.start,
                }

                await websocket.send_text(json.dumps(msg))
            except Exception as e:
                logger.error("transcript_forward_error", error=str(e))

        async def on_error(self, error, **kwargs):
            logger.error("deepgram_error", error=str(error))
            try:
                await websocket.send_text(
                    json.dumps(
                        {
                            "type": "error",
                            "message": "Transcription service error",
                        }
                    )
                )
            except Exception:
                pass

        deepgram_connection.on(LiveTranscriptionEvents.Transcript, on_message)
        deepgram_connection.on(LiveTranscriptionEvents.Error, on_error)

        options = LiveOptions(
            model=settings.deepgram_model,
            language=settings.deepgram_language,
            smart_format=True,
            diarize=True,
            punctuate=True,
            utterances=True,
            interim_results=True,
            encoding="linear16",
            sample_rate=16000,
        )

        started = await deepgram_connection.start(options)
        if not started:
            await websocket.send_text(
                json.dumps(
                    {
                        "type": "error",
                        "message": "Failed to connect to transcription service",
                    }
                )
            )
            await websocket.close()
            return

        logger.info("transcription_started", user_id=auth["user_id"])

        while True:
            data = await websocket.receive_bytes()
            await deepgram_connection.send(data)

    except WebSocketDisconnect:
        logger.info("client_disconnected", user_id=auth["user_id"])
    except Exception as e:
        logger.error("websocket_error", error=str(e), user_id=auth["user_id"])
    finally:
        if deepgram_connection:
            try:
                await deepgram_connection.finish()
            except Exception:
                pass
        logger.info("transcription_ended", user_id=auth["user_id"])
