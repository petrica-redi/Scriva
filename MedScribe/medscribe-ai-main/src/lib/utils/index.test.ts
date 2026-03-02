import {
  cn,
  formatDuration,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";

describe("utils", () => {
  it("formats duration as mm:ss", () => {
    expect(formatDuration(0)).toBe("00:00");
    expect(formatDuration(65)).toBe("01:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("returns fallback values for unknown statuses", () => {
    expect(getStatusColor("unknown_status")).toBe("bg-gray-100 text-gray-700");
    expect(getStatusLabel("unknown_status")).toBe("unknown_status");
  });

  it("returns known status labels", () => {
    expect(getStatusLabel("note_generated")).toBe("Note Generated");
    expect(getStatusColor("reviewed")).toBe("bg-emerald-100 text-emerald-700");
  });

  it("merges classes correctly", () => {
    expect(cn("px-2", "px-4", "text-sm")).toContain("px-4");
  });
});
