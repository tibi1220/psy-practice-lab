import { resources } from './index';

/** Compatibility for stable English labels stored in puzzle data and history. */
export const sourceKeys: Record<string, string> = {};
function indexLabels(section: Record<string, unknown>, prefix = '') {
  for (const [name, value] of Object.entries(section)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === 'string') sourceKeys[value] = key;
    else if (value && typeof value === 'object')
      indexLabels(value as Record<string, unknown>, key);
  }
}
indexLabels(resources.en.translation);

// Older saved labels retain their original spelling.
for (const [label, key] of [
  [
    'Adaptive practice advances after four correct answers in the last five, then reaches monochrome rounds after four correct 5×5 answers in the last five. Extra-hard rounds alternate all-grey and all-black shapes.',
    'deductiveReasoning.instructions.adaptivePracticeAdvancesAfterFourCorrectAnswersInThe',
  ],
  [
    'Extra hard · 5×5, grey/black shapes',
    'deductiveReasoning.labels.extraHard55GreyBlackShapes',
  ],
  [
    'Choose Green or Grey for each unlabelled grid. You may change choices or clear all classifications before submitting.',
    'greenGreyClassification.instructions.chooseGreenOrGreyForEachUnlabeledGridYou',
  ],
  [
    'Choose Green or Grey for every grid. Change your selections or clear them before submitting. A question is correct when all four classifications are correct.',
    'greenGreyClassification.instructions.chooseGreenOrGreyForEveryGridChangeYour',
  ],
  [
    'Compare six diamond grids from the green and grey groups, then classify four new grids using the hidden rule.',
    'greenGreyClassification.instructions.compareSixDiamondGridsFromTheGreenAndGrey',
  ],
  [
    'Discover what separates the green and grey groups',
    'greenGreyClassification.labels.discoverWhatSeparatesTheGreenAndGreyGroups',
  ],
  [
    'Every number in a green grid is in the range 1–4. Every number in a grey grid is in the range 5–9.',
    'greenGreyClassification.instructions.everyNumberInAGreenGridIsInThe',
  ],
  [
    'Green grids contain an odd number of letters. Grey grids contain an even number of letters. Count letters, ignoring their identities and positions.',
    'greenGreyClassification.instructions.greenGridsContainAnOddNumberOfLettersGrey',
  ],
  [
    'Green grids contain at least five copies of one letter. Grey grids have no letter repeated five or more times. Ignore numbers and positions.',
    'greenGreyClassification.instructions.greenGridsContainAtLeastFiveCopiesOfOne',
  ],
  [
    'Green grids contain at least four Zs. Grey grids contain fewer than four Zs. Their positions do not matter.',
    'greenGreyClassification.instructions.greenGridsContainAtLeastFourZsGreyGrids',
  ],
  [
    'Green grids contain at least three 7s. Grey grids contain fewer than three 7s. Their positions do not matter.',
    'greenGreyClassification.instructions.greenGridsContainAtLeastThree7sGreyGrids',
  ],
  [
    'Green grids contain exactly three {{target}}s. Grey grids contain exactly one. Their positions do not matter.',
    'greenGreyClassification.messages.greenGridsContainExactlyThreeTargetSGreyGrids',
  ],
  [
    'Green grids contain only even numbers. Grey grids contain only odd numbers.',
    'greenGreyClassification.labels.greenGridsContainOnlyEvenNumbersGreyGridsContain',
  ],
  [
    'Green grids contain only numbers less than 5 (1–4). Grey grids contain only numbers greater than 5 (6–9). Neither group contains 5.',
    'greenGreyClassification.instructions.greenGridsContainOnlyNumbersLessThan514',
  ],
  [
    'Green grids have letters in the {{items}} cells and numbers elsewhere. Grey grids have numbers in those cells and three letters elsewhere.',
    'greenGreyClassification.messages.greenGridsHaveLettersInTheItemsCellsAnd',
  ],
  [
    'Green/grey classification walkthrough',
    'greenGreyClassification.tutorial.greenGreyClassificationWalkthrough',
  ],
  ['Grey', 'greenGreyClassification.labels.grey'],
  [
    'In green grids, the bottom three cells have a larger sum than the top three cells. In grey grids, the top three have a larger sum. The three cells across the middle are distractors.',
    'greenGreyClassification.instructions.inGreenGridsTheBottomThreeCellsHaveA',
  ],
  [
    'In green grids, the rightmost three cells have a larger sum than the leftmost three cells. In grey grids, the leftmost three have a larger sum. The three cells down the middle are distractors.',
    'greenGreyClassification.instructions.inGreenGridsTheRightmostThreeCellsHaveA',
  ],
  [
    'In green grids, the sum of all numbers is below 10. In grey grids, it is greater than 10. Ignore letters; no grid totals exactly 10.',
    'greenGreyClassification.instructions.inGreenGridsTheSumOfAllNumbersIs',
  ],
  [
    'In green grids, the top three numbers are in the range 1–5 and the bottom three are in the range 6–9. Grey grids reverse these ranges. The middle three cells are distractors.',
    'greenGreyClassification.instructions.inGreenGridsTheTopThreeNumbersAreIn',
  ],
  [
    'In green grids, the topmost number is smaller than the bottommost number. In grey grids, the topmost number is larger. Other cells are distractors.',
    'greenGreyClassification.instructions.inGreenGridsTheTopmostNumberIsSmallerThan',
  ],
  [
    'In green grids, the {{positionNames}} and {{positionNames2}} cells match. In grey grids they differ. Other cells are distractors.',
    'greenGreyClassification.messages.inGreenGridsThePositionnamesAndPositionnames2CellsMatch',
  ],
  [
    'In grey grids, all four corner values (top, right, bottom, and left) are equal. In green grids, the four corners are not all equal. Other cells are distractors.',
    'greenGreyClassification.instructions.inGreyGridsAllFourCornerValuesTopRight',
  ],
  [
    'Infer a rule from six labelled examples, then classify four new grids. Demo answers are not saved.',
    'greenGreyClassification.instructions.inferARuleFromSixLabeledExamplesThenClassify',
  ],
  [
    'Six labelled examples',
    'greenGreyClassification.labels.sixLabeledExamples',
  ],
  [
    'Three examples are green and three are grey, in mixed order. The same hidden rule separates both groups. Characters remain upright inside the diamond grids.',
    'greenGreyClassification.instructions.threeExamplesAreGreenAndThreeAreGreyIn',
  ],
  [
    'Three green and three grey examples appear in mixed order. Find the rule that separates the groups.',
    'greenGreyClassification.instructions.threeGreenAndThreeGreyExamplesAppearInMixed',
  ],
  [
    'Try again: green has the larger sum at the bottom; grey has the larger sum at the top.',
    'greenGreyClassification.labels.tryAgainGreenHasTheLargerSumAtThe',
  ],
  ['centre', 'greenGreyClassification.labels.center'],
  [
    'Infer the rule separating six labelled diamond grids, then classify four new grids as green or grey.',
    'home.cards.greenGreyClassification.description',
  ],
  [
    'Drag a piece to a highlighted destination, or select it and tap a highlighted cell. With a keyboard, focus a piece and press Enter, then focus a destination and press Enter. Reach the target in two moves. In harder tasks, bolted grey obstacles cannot move.',
    'motionPlanning.instructions.dragAPieceToAHighlightedDestinationOrSelect',
  ],
  [
    'Keep practising, or continue to the test. The green block can move to row 3, column 3, freeing a path for the ball.',
    'motionPlanning.instructions.keepPracticingOrContinueToTheTestTheGreen',
  ],
  [
    'Move the red ball to the black target. Coloured blocks move in any direction but cannot rotate. Bolted grey obstacles stay fixed. A placement of one piece counts as one move, even if its path turns.',
    'motionPlanning.instructions.moveTheRedBallToTheBlackTargetColored',
  ],
  [
    'Pieces cannot overlap, rotate, or leave the grid. Bolted grey obstacles remain fixed. Numbered coloured blocks can move in all four directions.',
    'motionPlanning.instructions.piecesCannotOverlapRotateOrLeaveTheGridBolted',
  ],
  [
    'Rearrange coloured blocks and move the red ball to the black target in as few moves as possible. Practice inspired by motionChallenge.',
    'motionPlanning.instructions.rearrangeColoredBlocksAndMoveTheRedBallTo',
  ],
  [
    'The black ring marks the target, including when a block covers it. Numbered coloured blocks can move; bolted grey obstacles cannot. This is a shortest solution under the practice move rules.',
    'motionPlanning.instructions.theBlackRingMarksTheTargetIncludingWhenA',
  ],
  [
    'The red ball must reach the black circle. Think about which blocks stop it, and where those blocks can fit. Coloured blocks move freely without rotating.',
    'motionPlanning.instructions.theRedBallMustReachTheBlackCircleThink',
  ],
  ['Software licences', 'numericalReasoning.companies.softwareLicenses'],
  ['Data centres', 'numericalReasoning.data.dataCenters'],
  ['Green/Grey Classification', 'common.symbols.greenGreyClassification'],
  [
    'Green/Grey Classification · PSY Practice Lab',
    'common.symbols.greenGreyClassificationPsyPracticeLab',
  ],
  [
    'Inductive Reasoning — Green/Grey Classification',
    'common.symbols.inductiveReasoningGreenGreyClassification',
  ],
  ['grey', 'common.symbols.grey'],
])
  sourceKeys[label] = key;
