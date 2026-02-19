import urllib.request, json

token = "ntn_H125272570697FL9ENkjp10ZPnsRcL0H98HC5QWBjZX9an"
page_id = "30a04aab13ca80dba64ff51cbb2f9ae1"

req = urllib.request.Request(
    f"https://api.notion.com/v1/pages/{page_id}",
    headers={
        "Authorization": f"Bearer {token}",
        "Notion-Version": "2022-06-28",
    }
)
try:
    resp = urllib.request.urlopen(req)
    data = json.loads(resp.read())
    print("SUCCESS!", data.get("object"), data.get("id"))
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"ERROR {e.code}:", body[:300])
