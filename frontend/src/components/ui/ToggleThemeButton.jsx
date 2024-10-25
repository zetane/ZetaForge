import { darkModeAtom } from "@/atoms/themeAtom";
import { Moon, Sun } from "@carbon/icons-react";
import { Toggle } from "@carbon/react";
import { useAtom } from "jotai";

const ToggleThemeButton = () => {
    const [darkMode, setDarkMode] = useAtom(darkModeAtom);

    const handleToggle = () => {
        setDarkMode(!darkMode)        
    };

    return (
        <div className="ztn--toggle-container relative flex">
            <Toggle
                id="theme-toggle"
                onToggle={handleToggle}
                labelA=""
                labelB=""
                toggled={!darkMode}
            />
            <Sun
                onClick={() => handleToggle()}
                className={`absolute left-[4.5px] top-[4px] cursor-pointer text-white ${darkMode && "hidden"}`}
            />
            <Moon
                onClick={() => handleToggle()}
                className={`absolute right-[4px] top-[4px] cursor-pointer text-black ${!darkMode && "hidden"}`}
            />
        </div>
    );
}

export default ToggleThemeButton