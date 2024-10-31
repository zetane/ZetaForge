import { darkModeAtom } from "@/atoms/themeAtom";
import { EditorView } from "@codemirror/view";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { githubLight } from "@uiw/codemirror-theme-github";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { forwardRef } from "react";

import CodeMirror from "@uiw/react-codemirror";
import { atom, useAtom } from "jotai";

const backgroundTheme = EditorView.theme({
  ".cm-content": {
    backgroundColor: "var(--beCodeEditorBackground)",
    "& ::selection": {
      backgroundColor: "#ffcc00",
    },
  },
});

const viewerBackgroundTheme = EditorView.theme({
  ".cm-content": {
    backgroundColor: "var(--beCodeViewerBackground)",
    "& ::selection": {
      backgroundColor: "#ffcc00",
    },
  },
});

const themeAtom = atom((get) => (get(darkModeAtom) ? vscodeDark : githubLight));

export const ViewerCodeMirror = ({ currentIndex, code }) => {
  const [theme] = useAtom(themeAtom);
  const extensions = [loadLanguage("python"), viewerBackgroundTheme];
  return (
    <CodeMirror
      key={currentIndex}
      value={code}
      style={{ height: "100%" }}
      height="100%"
      theme={theme}
      extensions={extensions}
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
        searchKeymap: true,
        historyKeymap: false,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
        tabSize: 2,
      }}
    />
  );
};

export const EditorCodeMirror = forwardRef(
  ({ code, onChange, keymap }, ref) => {
    const [theme] = useAtom(themeAtom);
    const extensions = [loadLanguage("python"), backgroundTheme, keymap];

    return (
      <CodeMirror
        value={code}
        style={{ height: "100%" }}
        height="100%"
        extensions={extensions}
        ref={ref}
        basicSetup={{
          lineNumbers: true,
          highlightActiveLineGutter: false,
          foldGutter: false,
          allowMultipleSelections: false,
          closeBrackets: false,
          dropCursor: true,
          tabSize: 4,
          highlightActiveLine: false,
          highlightSelectionMatches: false,
          drawSelection: false,
        }}
        theme={theme}
        onChange={onChange}
      />
    );
  },
);

export const LogsCodeMirror = ({ code, onUpdate }) => {
  const [theme] = useAtom(themeAtom);
  return (
    <CodeMirror
      value={code}
      theme={theme}
      extensions={[EditorView.lineWrapping]}
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
        searchKeymap: true,
        historyKeymap: false,
        foldKeymap: false,
        completionKeymap: false,
        lintKeymap: false,
        tabSize: 2,
      }}
      onUpdate={onUpdate}
    />
  );
};
