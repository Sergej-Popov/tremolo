
export type noteString = "e" | "A" | "D" | "G" | "B" | "E"
export type noteHalfStep = "A" | "B" | "C" | "D" | "E" | "F" | "G";
export type noteFullStep = "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B" | "C" | "C#" | "D" | "D#";
export type chordNotation = [noteString, number][]

export const noteNames = ["A", "B", "C", "D", "E", "F", "G"];
export const stringNames: noteString[] = ["e", "A", "D", "G", "B", "E"];

export function calculateNote(string: string, fret: number): noteFullStep {
    const standardTuning: Record<string, number> = {
        'E': 7, // High E
        'A': 0,
        'D': 5,
        'G': 10,
        'B': 2
    };

    const noteNames: noteFullStep[] = [
        'A', 'A#', 'B', 'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#'
    ];


    const baseNoteIndex = standardTuning[string.toUpperCase()];
    const noteIndex = (baseNoteIndex + fret) % 12;

    return noteNames[noteIndex];
}


export class ScaleOrChordShape {

    constructor(public name: string, public notes: chordNotation) {
    }

    public static creteFrom(name: string, scale: ScaleOrChordShape, offset: number): ScaleOrChordShape {
        return new ScaleOrChordShape(name, scale.notes.map(([string, fret]) => [string, fret + offset]));
    }

    public static createGMarorPentatonic(): ScaleOrChordShape {
        return new ScaleOrChordShape("G Major Pentatonic", [
            ["e", 0], ["e", 3],
            ["A", 0], ["A", 2],
            ["D", 0], ["D", 2],
            ["G", 0], ["G", 2],
            ["B", 0], ["B", 3],
            ["E", 0], ["E", 3],
        ]);
    }

}
