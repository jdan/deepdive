import classnames from "classnames";
import qs from "qs";
import { useCallback, useEffect, useState } from "react";

type role = "assistant" | "user" | "system";

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
      content: "Hello, world!",
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
    <main className="p-24">
      {/* button to copy json to clipboard */}
      <div className="flex flex-row mb-8">
        <button
          className="bg-green-500 text-white rounded-md p-2"
          onClick={() => {
            navigator.clipboard.writeText(JSON.stringify(forest));
          }}
        >
          Copy JSON
        </button>
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
  const handleAiClick = useCallback(() => {
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

  return (
    <div className="w-96">
      <div
        className={classnames("p-4 rounded-md shadow-md", {
          "bg-purple-100": tree.role === "assistant",
        })}
      >
        {tree.role === "user" ? (
          <textarea
            className="p-2 resize-none w-full rounded-md"
            value={tree.content}
            onChange={(e) =>
              setTree((tree) => ({ ...tree, content: e.target.value }))
            }
            rows={tree.content.split("\n").length}
          />
        ) : (
          <div className="p-2">{tree.content}</div>
        )}
        <div className="flex flex-row gap-2">
          <button
            className="bg-blue-500 text-white rounded-md p-2"
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
          </button>

          {tree.role === "user" && (
            <button
              className="bg-purple-500 text-white rounded-md p-2"
              onClick={handleAiClick}
            >
              Add AI ✨
            </button>
          )}

          {onDelete && (
            <button
              className="bg-red-500 text-white rounded-md p-2"
              onClick={onDelete}
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="mt-8 ml-8 flex flex-col">
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
            }}
          />
        ))}
      </div>
    </div>
  );
}
