import PieceColour from "../types/PieceColour";

export function opinionatedEvaluation(
    whiteEvaluation: number,
    perspective: PieceColour
) {
    return perspective == "black"
        ? -whiteEvaluation
        : whiteEvaluation;
}