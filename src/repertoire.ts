import { ScaleOrChordShape } from "./music-theory";

export const chords = [
    new ScaleOrChordShape("C", [["A", 3], ["D", 2], ["B", 1]]),
    new ScaleOrChordShape("E", [["A", 2], ["D", 2], ["G", 1]]),
    new ScaleOrChordShape("E-", [["A", 2], ["D", 2]]),
    new ScaleOrChordShape("A", [["D", 2], ["G", 2], ["B", 2]]),
    new ScaleOrChordShape("A-", [["D", 2], ["G", 2], ["B", 1]]),
    new ScaleOrChordShape("D", [["G", 2], ["B", 3], ["E", 2]]),
    new ScaleOrChordShape("G", [["e", 3], ["A", 2], ["B", 3], ["E", 3]]),
];

export const scales = [
    new ScaleOrChordShape("A Major Pentatonic", [
        ["e", 5], ["e", 7],
        ["A", 4], ["A", 7],
        ["D", 4], ["D", 7],
        ["G", 4], ["G", 6],
        ["B", 5], ["B", 7],
        ["E", 5], ["E", 7],
    ]),
    ScaleOrChordShape.creteFrom("A Minor Pentatonic", ScaleOrChordShape.createGMarorPentatonic(), 5),
    new ScaleOrChordShape("A Major", [
        ["e", 5], ["e", 7],
        ["A", 4], ["A", 5], ["A", 7],
        ["D", 4], ["D", 6], ["D", 7],
        ["G", 4], ["G", 6], ["G", 7],
        ["B", 5], ["B", 7],
        ["E", 4], ["E", 5], ["E", 7],
    ]),
    new ScaleOrChordShape("A Minor", [
        ["e", 5], ["e", 7], ["e", 8],
        ["A", 5], ["A", 7], ["A", 8],
        ["D", 5], ["D", 7],
        ["G", 4], ["G", 5], ["G", 7],
        ["B", 5], ["B", 6], ["B", 8],
        ["E", 5], ["E", 7], ["E", 8],
    ]),
    ScaleOrChordShape.createGMarorPentatonic(),
    ScaleOrChordShape.creteFrom("G Minor Pentatonic", ScaleOrChordShape.createGMarorPentatonic(), 3),
];
