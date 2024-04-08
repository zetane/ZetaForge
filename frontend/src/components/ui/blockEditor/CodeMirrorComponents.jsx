import { darkModeAtom } from "@/atoms/themeAtom";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { basicDark, basicLight } from '@uiw/codemirror-theme-basic';
import CodeMirror from "@uiw/react-codemirror";
import { atom, useAtom } from "jotai";
import { EditorView } from "@codemirror/view"

const themeAtom = atom((get) => get(darkModeAtom) ? basicDark : basicLight);

export const ViewerCodeMirror = ({ code }) => {
  const [theme] = useAtom(themeAtom);
  return (
    <CodeMirror
      value={code}
      theme={theme}
      extensions={[loadLanguage("python")]}
      readOnly={true}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLineGutter: false,
        highlightSpecialChar: false,
        history: false,
        foldGutter: false,
        drawSelection: false,
        dropCursor: false,
        allowMultipleSelections: false,
        indentOnInput: false,
        syntaxHighlighting: false,
        bracketMatching: false,
        closeBrackets: false,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLine: false,
        highlightSelectionMatches: false,
        closeBracketsKeymap: false,
        defaultKeymap: false,
        searchKeymap: false,
        historyKeymap: false,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
        tabSize: 2,
      }}
    />
  );
};

export const EditorCodeMirror = ({ code, onChange }) => {
  const [theme] = useAtom(themeAtom);
  return (
    <CodeMirror
      value={code}
      extensions={[loadLanguage("python")]}
      basicSetup={{
        tabSize: 2,
        highlightActiveLine: false,
      }}
      theme={theme}
      onChange={onChange}
    />
  );
};

export const LogsCodeMirror = ({ code }) => {
  const [theme] = useAtom(themeAtom);
  return (
    <CodeMirror
      value={code}
      theme={theme}
      extensions={[EditorView.lineWrapping]}
      readOnly={true}
      basicSetup={{
        lineNumbers: false,
        highlightActiveLineGutter: false,
        highlightSpecialChar: false,
        history: false,
        foldGutter: false,
        drawSelection: false,
        dropCursor: false, 
        allowMultipleSelections: false,
        indentOnInput: false,
        syntaxHighlighting: false,
        bracketMatching: false,
        closeBrackets: false,
        autocompletion: false,
        rectangularSelection: false,
        crosshairCursor: false,
        highlightActiveLine: false,
        highlightSelectionMatches: false,
        closeBracketsKeymap: false,
        defaultKeymap: false,
        searchKeymap: false,
        historyKeymap: false,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
        tabSize: 2,
      }}
    />
  );
};
