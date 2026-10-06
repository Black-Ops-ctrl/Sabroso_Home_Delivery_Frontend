import { useTheme } from "../../context/ThemeContext";
import { useLive } from "../../context/LiveContext";

export default function ThemeLive() {
  const { reload } = useTheme();
  useLive(["app_settings"], reload);
  return null;
}
