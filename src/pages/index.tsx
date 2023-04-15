import classnames from "classnames";
import hljs from "highlight.js";
import { marked } from "marked";
import qs from "qs";
import { useCallback, useEffect, useRef, useState } from "react";

marked.setOptions({
  highlight: function (code, lang) {
    const language = hljs.getLanguage(lang) ? lang : "plaintext";
    return hljs.highlight(code, { language }).value;
  },
});

type role = "assistant" | "user";

interface Tree {
  role: role;
  content: string;
  children: Tree[];
}

export default function Home() {
  // TODO: Not good that it's a tree but that's okay
  const [forest, setForest] = useState<Tree[]>([
    {
      role: "user",
      content: "",
      children: [],
    },
  ]);

  // when pasting into the window, set the forest to that json
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const json = e.clipboardData?.getData("text/plain");
      if (json) {
        try {
          const newForest = JSON.parse(json);
          setForest(newForest);
        } catch (e) {
          console.error(e);
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, []);

  return (
    <main className="p-24 bg-slate-50 min-h-screen">
      {/* button to copy json to clipboard */}
      <div className="flex flex-row mb-8">
        <Button
          role="user"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(forest));
          }}
        >
          Copy transcript
        </Button>
      </div>

      {forest.map((tree, idx) => (
        <Cell
          key={idx}
          tree={tree}
          setTree={(callback) => {
            setForest((forest) =>
              forest.map((f, i) => (i === idx ? callback(f) : f))
            );
          }}
          transcript={[]}
        />
      ))}
    </main>
  );
}

interface CellProps {
  tree: Tree;
  setTree: (callback: (tree: Tree) => Tree) => void;
  transcript: Tree[];
  onDelete?: () => void;
}

function Cell({ tree, setTree, onDelete, transcript }: CellProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // focus the input when it's added
  useEffect(() => {
    if (tree.role === "user") {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [tree.role]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        // append a new child
        setTree((tree) => ({
          ...tree,
          children: [
            ...tree.children,
            {
              role: "user",
              content: "",
              children: [],
            },
          ],
        }));
      } else if (e.key === "Backspace" && !e.shiftKey) {
        if (tree.content === "") {
          e.preventDefault();
          onDelete?.();
        }
      }
    },
    [setTree, onDelete, tree.content]
  );

  const handleAskAiClick = useCallback(() => {
    // Save the index for later
    const idx = tree.children.length;

    // append a child with role assistant
    setTree((tree) => ({
      ...tree,
      children: [
        ...tree.children,
        {
          role: "assistant",
          content: "",
          children: [],
        },
      ],
    }));

    // transcript without any children fields
    const transcriptWithoutChildren: Record<string, string>[] = [
      ...transcript,
      tree,
    ].map((t) => ({
      role: t.role,
      content: t.content,
    }));
    const searchParams = qs.stringify({
      transcript: transcriptWithoutChildren,
    });

    const aiStream = new EventSource(`/api/ai?${searchParams}`);
    // cleanup?
    aiStream.addEventListener("message", (e) => {
      if (e.data === "[DONE]") {
        aiStream.close();
        return;
      }

      const message = JSON.parse(e.data);
      const delta = message.choices[0].delta.content;

      if (delta) {
        // update the child at idx
        setTree((tree) => ({
          ...tree,
          children: tree.children.map((c, i) =>
            i === idx ? { ...c, content: c.content + delta } : c
          ),
        }));
      }
    });
  }, [setTree, transcript, tree]);

  const handleRegenerateAiClick = useCallback(() => {
    setTree((tree) => ({
      ...tree,
      content: "",
    }));

    // transcript without any children fields
    const transcriptWithoutChildren: Record<string, string>[] = transcript.map(
      (t) => ({
        role: t.role,
        content: t.content,
      })
    );
    const searchParams = qs.stringify({
      transcript: transcriptWithoutChildren,
    });

    const aiStream = new EventSource(`/api/ai?${searchParams}`);
    // cleanup?
    aiStream.addEventListener("message", (e) => {
      if (e.data === "[DONE]") {
        aiStream.close();
        return;
      }

      const message = JSON.parse(e.data);
      const delta = message.choices[0].delta.content;

      if (delta) {
        setTree((tree) => ({
          ...tree,
          content: tree.content + delta,
        }));
      }
    });
  }, [setTree, transcript]);

  return (
    <div className="w-full">
      <div
        className={classnames("rounded-md w-96", {
          "bg-purple-100": tree.role === "assistant",
          "py-2": tree.role === "user",
          "p-2": tree.role === "assistant",
        })}
      >
        {tree.role === "user" ? (
          <textarea
            placeholder="Type your message here..."
            ref={inputRef}
            className="p-1 resize-none w-full rounded-md bg-transparent"
            value={tree.content}
            onChange={(e) =>
              setTree((tree) => ({ ...tree, content: e.target.value }))
            }
            onKeyDown={handleKeyDown}
            rows={tree.content.split("\n").length}
          />
        ) : (
          <div
            className="p-1"
            dangerouslySetInnerHTML={{
              __html: tree.content ? marked(tree.content) : "Thinking...",
            }}
          />
        )}

        <div className="flex flex-row gap-2 mt-1">
          <Button
            role={tree.role}
            onClick={() =>
              setTree((tree) => ({
                ...tree,
                children: [
                  ...tree.children,
                  {
                    role: "user",
                    content: "",
                    children: [],
                  },
                ],
              }))
            }
          >
            Add Child
          </Button>

          {tree.role === "user" && (
            <Button role={tree.role} onClick={handleAskAiClick}>
              Ask AI ✨
            </Button>
          )}

          {tree.role === "assistant" && (
            <Button role={tree.role} onClick={handleRegenerateAiClick}>
              Regenerate ✨
            </Button>
          )}

          {onDelete && (
            <Button role={tree.role} onClick={onDelete}>
              Delete
            </Button>
          )}
        </div>
      </div>
      <div className="mt-2 ml-6 flex flex-col">
        {tree.children.map((child, idx) => (
          <Cell
            key={idx}
            tree={child}
            transcript={[...transcript, tree]}
            setTree={(callback) => {
              setTree((tree) => ({
                ...tree,
                children: tree.children.map((c, i) =>
                  i === idx ? callback(c) : c
                ),
              }));
            }}
            onDelete={() => {
              setTree((callback) => ({
                ...tree,
                children: tree.children.filter((_, i) => i !== idx),
              }));
              // focus my input
              inputRef.current?.focus();
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
  role: role;
}
function Button({ children, onClick, role }: ButtonProps) {
  const isPurple = role === "assistant";

  return (
    <button
      onClick={onClick}
      className={classnames("text-xs p-1 rounded-sm", {
        "hover:bg-slate-200": !isPurple,
        "hover:bg-purple-200": isPurple,
        "text-slate-500": !isPurple,
        "text-slate-600": isPurple,
      })}
    >
      {children}
    </button>
  );
}
