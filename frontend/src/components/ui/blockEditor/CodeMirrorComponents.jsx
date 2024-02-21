import { EditorView } from "@codemirror/view";
import { loadLanguage } from "@uiw/codemirror-extensions-langs";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import CodeMirror from "@uiw/react-codemirror";

export const ViewerCodeMirror = ({ code }) => {
  return (
    <CodeMirror
      value={code}
      theme={vscodeDark}
      extensions={[loadLanguage("python")]}
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

export const EditorCodeMirror = ({ code, onChange }) => {
  let myTheme = EditorView.theme(
    {
      "&": {
        // color: "white",
        backgroundColor: "black",
      },
    },
    { dark: true }
  );

  let combinedTheme = [myTheme, vscodeDark];

  return (
    <CodeMirror
      value={code}
      extensions={[loadLanguage("python")]}
      basicSetup={{
        tabSize: 2,
        highlightActiveLine: false,
      }}
      theme={combinedTheme}
      onChange={onChange}
    />
  );
};

export const LogsCodeMirror = ({ code }) => {
  return (
    <CodeMirror
      value={code}
      theme={vscodeDark}
      className="text-color"
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
