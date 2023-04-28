const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

async function autocomplete(prompt: string, signal) {
  return fetch("https://api.openai.com/v1/chat/completions", {
    signal,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-3.5-turbo",
      temperature: 0.9,
      messages: [
        {
          role: "system",
          content:
            "Complete the user text with the mostly likely next text they would type. If the text is ambiguous complete it creatively or respond randomly. DO NOT respond that you are an AI assistant or that you need more context.",
        },
        {
          role: "user",
          content: "It was the best of times, ",
        },
        {
          role: "assistant",
          content: "it was the worst of times,",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    }),
  })
    .then((res) => res.json())
    .then((res) => res.choices[0].message.content);
}

function getCursorXY(inputElement) {
  const fontSize = window
    .getComputedStyle(inputElement)
    .getPropertyValue("font-size");

  const tempElement = document.createElement("div");
  tempElement.style.position = "fixed";

  const inputRect = inputElement.getBoundingClientRect();
  tempElement.style.top = `${inputRect.top + window.pageYOffset}px`;
  tempElement.style.left = `${inputRect.left + window.pageXOffset}px`;
  tempElement.style.width = `${inputElement.offsetWidth}px`;
  tempElement.style.height = `${inputElement.offsetHeight}px`;
  const properties = [
    "padding",
    "border",
    "flex-wrap",
    "overflow",
    "white-space",
    "word-wrap",
    "word-break",
    "line-height",
    "text-align",
    "font",
    "font-family",
    "font-size",
    "font-style",
    "font-variant",
    "font-weight",
    "letter-spacing",
    "text-indent",
    "text-transform",
    "word-spacing",
    "text-rendering",
  ];
  for (const property of properties) {
    tempElement.style[property] = window
      .getComputedStyle(inputElement)
      .getPropertyValue(property);
  }

  const inputValue = inputElement.value.substring(
    0,
    inputElement.selectionStart
  );
  const inputLines = inputValue.split("\n");
  const inputTexts = [];

  for (let i = 0; i < inputLines.length; i++) {
    if (i !== 0) {
      inputTexts.push(document.createElement("br"));
    }

    if (inputLines[i] === "") {
      inputTexts.push(document.createTextNode("\u00A0"));
    } else {
      inputTexts.push(document.createTextNode(inputLines[i]));
    }
  }

  inputTexts.push(document.createTextNode("\u00A0"));

  for (let i = 0; i < inputTexts.length; i++) {
    tempElement.appendChild(inputTexts[i]);
  }

  const range = document.createRange();
  range.setStart(
    inputTexts[inputTexts.length - 2],
    inputLines[inputLines.length - 1].length
  );
  range.setEnd(
    inputTexts[inputTexts.length - 2],
    inputLines[inputLines.length - 1].length
  );

  document.body.appendChild(tempElement);

  const rect = range.getBoundingClientRect();
  const x = rect.left - window.scrollX - inputElement.scrollLeft;
  const y = rect.top + 1.15 * parseFloat(fontSize) - window.scrollY - inputElement.scrollTop;

  document.body.removeChild(tempElement);

  return { x, y };
}

import React from "react";
import { useState, useEffect, useRef } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const container = document.createElement("div");
container.setAttribute("id", "webpilot-root");
document.body.appendChild(container);

const root = createRoot(container!);

function useCursorPosition() {
  const targetRef = useRef<HTMLElement | null>(null);
  const [cursorPosition, setCursorPosition] = useState({
    target: null,
    x: 0,
    y: 0,
  });

  useEffect(() => {
    const updateCursorPosition = (ev) => {
      const target = ev.target as HTMLElement;
      if (target && isTextInput(target)) {
        targetRef.current = target;
        if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
          const { x, y } = getCursorXY(target);
          setCursorPosition({ target, x, y });
        }
      }
    };

    const onScroll = () => {
      const target = targetRef.current;
      if (target && isTextInput(target)) {
        if (target.tagName === "TEXTAREA" || target.tagName === "INPUT") {
          const { x, y } = getCursorXY(target);
          setCursorPosition((cursorPosition) => ({ ...cursorPosition, x, y }));
        }
      }
    };

    const events = ["focus", "focusin", "click", "input", "keypress", "keyup"];

    for (const event of events) {
      document.addEventListener(event, updateCursorPosition, true);
    }
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("wheel", onScroll, true);

    const onBlur = () => {
      setCursorPosition({ target: null, x: 0, y: 0 });
    };
    document.addEventListener("blur", onBlur, true);
    document.addEventListener("focusout", onBlur, true);

    return () => {
      for (const event of events) {
        document.removeEventListener(event, updateCursorPosition, true);
      }
      window.addEventListener("scroll", onScroll, true);
      window.addEventListener("wheel", onScroll, true);

      document.removeEventListener("blur", onBlur, true);
      document.removeEventListener("focusout", onBlur, true);
    };
  }, []);

  return cursorPosition;
}

function useWindowFocused() {
  const [windowFocused, setWindowFocused] = useState(true);

  useEffect(() => {
    const updateWindowFocused = (ev) => {
      setWindowFocused(ev.type === "focus");
    };

    window.addEventListener("focus", updateWindowFocused);
    window.addEventListener("blur", updateWindowFocused);

    return () => {
      window.removeEventListener("focus", updateWindowFocused);
      window.removeEventListener("blur", updateWindowFocused);
    };
  }, []);

  return windowFocused;
}

function isTextInput(element) {
  const inputTypes = ["text", "password", "search", "email", "tel", "url"];
  return (
    (element.tagName === "INPUT" && inputTypes.includes(element.type)) ||
    element.tagName === "TEXTAREA"
  );
}

function App() {
  const rootRef = useRef<HTMLDivElement>(null);
  const { target, x, y } = useCursorPosition();
  const windowFocused = useWindowFocused();
  const [loading, setLoading] = useState(false);

  const [suggestion, setSuggestion] = useState<string>("");
  const [context, setContext] = useState<string>("");

  // handle global tab key press
  useEffect(() => {
    const handleTab = (ev) => {
      if (ev.key === "Tab") {
        ev.preventDefault();
        if (suggestion) {
          const element = target;
          if (element) {
            if (element.tagName === "TEXTAREA") {
              const textArea = element as HTMLTextAreaElement;
              const { selectionStart, selectionEnd } = textArea;
              const value = textArea.value;
              const before = value.substring(0, selectionStart);
              const after = value.substring(selectionEnd);
              textArea.value = `${before}${suggestion}${after}`;
              textArea.selectionStart = selectionStart + suggestion.length;
              textArea.selectionEnd = selectionStart + suggestion.length;

              setSuggestion("");
            }
            if (element.tagName === "INPUT" && element.type === "text") {
              const input = element as HTMLInputElement;
              const { selectionStart, selectionEnd } = input;
              const value = input.value;
              const before = value.substring(0, selectionStart);
              const after = value.substring(selectionEnd);
              input.value = `${before}${suggestion}${after}`;
              input.selectionStart = selectionStart + suggestion.length;
              input.selectionEnd = selectionStart + suggestion.length;

              setSuggestion("");
            }
          }
        }
      }
    };
    document.addEventListener("keydown", handleTab);
    return () => {
      document.removeEventListener("keydown", handleTab);
    };
  }, [suggestion]);

  useEffect(() => {
    if (!rootRef.current) {
      return;
    }
    const element = rootRef.current;
    if (element) {
      element.style.left = `${x}px`;
      element.style.top = `${y}px`;
    }
    setLoading(false);
    setSuggestion("");
  }, [x, y, target]);

  useEffect(() => {
    if (!target || !isTextInput(target)) {
      return;
    }
    const update = (element) => {
      if (element.tagName === "TEXTAREA") {
        const textArea = element as HTMLTextAreaElement;
        const { selectionStart } = textArea;
        const value = textArea.value;
        const before = value.substring(0, selectionStart);
        setContext(before);
      }
      if (element.tagName === "INPUT" && element.type === "text") {
        const input = element as HTMLInputElement;
        const { selectionStart } = input;
        const value = input.value;
        const before = value.substring(0, selectionStart);
        setContext(before);
      }
    };
    const onInput = (ev) => update(ev.target);
    const element = target;
    update(element);
    element.addEventListener("input", onInput);
    return () => {
      element.removeEventListener("input", onInput);
    };
  }, [target, x, y]);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const updateSuggestion = () => {
      if (context == "") {
        setLoading(false);
        return;
      }
      autocomplete(context, signal).then((suggestion) => {
        setLoading(false);
        setSuggestion(suggestion);
      });
    };
    setSuggestion("");
    setLoading(true);
    const timeout = setTimeout(updateSuggestion, 500);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [context]);

  return (
    <>
      {/* Draw border around focused element */}
      {windowFocused && target && (
        <div
          className="fixed pointer-events-none z-[9001] border border-blue-500"
          style={{
            left: target.getBoundingClientRect().left,
            top: target.getBoundingClientRect().top,
            width: target.getBoundingClientRect().width,
            height: target.getBoundingClientRect().height,
          }}
        ></div>
      )}
      {/* */}
      <div
        ref={rootRef}
        className="fixed pointer-events-none z-[9001] max-w-prose"
      >
        {windowFocused && target && isTextInput(target) && (
          <div className="flex justify-between items-center p-2 pointer-events-none bg-gray-50 border border-gray-200 shadow-lg rounded overflow-hidden gap-x-8">
            {loading && (
              <div className="mx-auto">
                <svg
                  className="animate-spin h-5 w-5 text-gray-800 dark:text-gray-100"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  ></path>
                </svg>
              </div>
            )}
            {!loading && (
              <>
                {suggestion !== "" ? (
                  <p className="whitespace-pre">{suggestion}</p>
                ) : (
                  <p className="whitespace-pre text-gray-300">No suggestion</p>
                )}
                <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg dark:bg-gray-600 dark:text-gray-100 dark:border-gray-500">
                  Tab
                </kbd>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
