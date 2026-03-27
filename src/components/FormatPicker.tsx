import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormatPickerProps {
  value: string;
  onChange: (val: string) => void;
  type?: "video" | "audio" | "all";
}

const FORMATS = {
  video: ["mp4", "mpg4", "mkv", "webm", "avi", "mov"],
  audio: ["mp3", "aac", "wav", "flac", "ogg"],
};

export function FormatPicker({ value, onChange, type = "all" }: FormatPickerProps) {
  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select output format" />
      </SelectTrigger>
      <SelectContent>
        {(type === "all" || type === "video") && (
          <SelectGroup>
            <SelectLabel>Video Formats</SelectLabel>
            {FORMATS.video.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                .{fmt}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {(type === "all" || type === "audio") && (
          <SelectGroup>
            <SelectLabel>Audio Formats</SelectLabel>
            {FORMATS.audio.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                .{fmt}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
