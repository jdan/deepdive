import classnames from "classnames";
import { useEffect, useState } from "react";

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
          setTree={(newTree: Tree) => {
            setForest(forest.map((t, i) => (i === idx ? newTree : t)));
          }}
          canChangeRole={false}
        />
      ))}
    </main>
  );
}

interface CellProps {
  tree: Tree;
  setTree: (newTree: Tree) => void;
  canChangeRole: boolean;
  onDelete?: () => void;
}

function Cell({ tree, setTree, onDelete, canChangeRole }: CellProps) {
  return (
    <div className="w-96">
      <div
        className={classnames("p-4 rounded-md shadow-md", {
          "bg-purple-100": tree.role === "assistant",
        })}
      >
        <textarea
          className="p-2 resize-none w-full rounded-md"
          value={tree.content}
          onChange={(e) => setTree({ ...tree, content: e.target.value })}
          rows={tree.content.split("\n").length}
        />
        <div className="flex flex-row gap-2">
          <button
            className="bg-blue-500 text-white rounded-md p-2"
            onClick={() =>
              setTree({
                ...tree,
                children: [
                  ...tree.children,
                  {
                    role: "user",
                    content: "",
                    children: [],
                  },
                ],
              })
            }
          >
            Add Child
          </button>

          {onDelete && (
            <button
              className="bg-red-500 text-white rounded-md p-2"
              onClick={onDelete}
            >
              Delete
            </button>
          )}

          {/* convert to assistant */}
          {canChangeRole && tree.role === "user" && (
            <button
              className="bg-purple-500 text-white rounded-md p-2"
              onClick={() => setTree({ ...tree, role: "assistant" })}
            >
              AI
            </button>
          )}
        </div>
      </div>
      <div className="mt-8 ml-8 flex flex-col">
        {tree.children.map((child, idx) => (
          <Cell
            canChangeRole
            key={idx}
            tree={child}
            setTree={(newTree) => {
              setTree({
                ...tree,
                children: tree.children.map((c, i) =>
                  i === idx ? newTree : c
                ),
              });
            }}
            onDelete={() => {
              setTree({
                ...tree,
                children: tree.children.filter((c, i) => i !== idx),
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
