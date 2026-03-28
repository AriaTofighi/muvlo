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
  type?: "video" | "audio" | "image" | "all";
  imageFormats?: string[];
  audioFormats?: string[];
  videoFormats?: string[];
}

const FORMATS = {
  video: ["mp4", "mkv", "webm", "avi", "mov"],
  audio: ["mp3", "aac", "wav", "flac", "ogg"],
  image: ["png", "jpg", "webp", "gif", "avif"],
};

export function FormatPicker({
  value,
  onChange,
  type = "all",
  imageFormats,
  audioFormats,
  videoFormats,
}: FormatPickerProps) {
  const resolvedVideoFormats = videoFormats ?? FORMATS.video;
  const resolvedAudioFormats = audioFormats ?? FORMATS.audio;
  const resolvedImageFormats = imageFormats ?? FORMATS.image;

  return (
    <Select value={value} onValueChange={(val) => val && onChange(val)}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="Select output format" />
      </SelectTrigger>
      <SelectContent>
        {(type === "all" || type === "video") && (
          <SelectGroup>
            <SelectLabel>Video Formats</SelectLabel>
            {resolvedVideoFormats.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                .{fmt}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {(type === "all" || type === "audio") && (
          <SelectGroup>
            <SelectLabel>Audio Formats</SelectLabel>
            {resolvedAudioFormats.map((fmt) => (
              <SelectItem key={fmt} value={fmt}>
                .{fmt}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {(type === "all" || type === "image") && (
          <SelectGroup>
            <SelectLabel>Image Formats</SelectLabel>
            {resolvedImageFormats.map((fmt) => (
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
