import { useState } from "react";

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

  return (
    <main className="p-24">
      {forest.map((tree, idx) => (
        <Cell
          tree={tree}
          setTree={(newTree: Tree) => {
            setForest(forest.map((t, i) => (i === idx ? newTree : t)));
          }}
        />
      ))}
    </main>
  );
}

interface CellProps {
  tree: Tree;
  setTree: (newTree: Tree) => void;
}

function Cell({ tree, setTree }: CellProps) {
  return (
    <div>
      <textarea
        value={tree.content}
        onChange={(e) => setTree({ ...tree, content: e.target.value })}
      />
      <div className="flex flex-row">
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
      </div>
      <div className="ml-4">
        {tree.children.map((child, idx) => (
          <Cell
            tree={child}
            setTree={(newTree) => {
              setTree({
                ...tree,
                children: tree.children.map((c, i) =>
                  i === idx ? newTree : c
                ),
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}
