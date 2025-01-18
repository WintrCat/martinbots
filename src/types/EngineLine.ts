import Move from "./Move";

interface EngineLine {
    evaluation: {
        type: "centipawn" | "mate";
        value: number;
    };
    depth: number;
    index: number;
    moves: Move[];
}

export default EngineLine;