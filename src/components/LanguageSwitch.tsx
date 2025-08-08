import { useI18n } from "@/i18n";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export const LanguageSwitch = () => {
  const { lang, setLang } = useI18n();
  return (
    <div className="inline-flex items-center gap-2">
      <Select value={lang} onValueChange={(v) => setLang(v as any)}>
        <SelectTrigger className="w-[110px]">
          <SelectValue placeholder="Language" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="en">English</SelectItem>
          <SelectItem value="pl">Polski</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

export default LanguageSwitch;
