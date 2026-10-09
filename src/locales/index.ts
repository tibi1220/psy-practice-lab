import enCapacityToAct from './en/capacity-to-act.json';
import huCapacityToAct from './hu/capacity-to-act.json';
import enCommon from './en/common.json';
import huCommon from './hu/common.json';
import enConcentration from './en/concentration.json';
import huConcentration from './hu/concentration.json';
import enCreateMonotonyPdf from './en/create-monotony-pdf.json';
import huCreateMonotonyPdf from './hu/create-monotony-pdf.json';
import enDeductiveReasoning from './en/deductive-reasoning.json';
import huDeductiveReasoning from './hu/deductive-reasoning.json';
import enDigitChallenge from './en/digit-challenge.json';
import huDigitChallenge from './hu/digit-challenge.json';
import enDistributiveAttention from './en/distributive-attention.json';
import huDistributiveAttention from './hu/distributive-attention.json';
import enDividedAttention from './en/divided-attention.json';
import huDividedAttention from './hu/divided-attention.json';
import enGreenGreyClassification from './en/green-grey-classification.json';
import huGreenGreyClassification from './hu/green-grey-classification.json';
import enGridClassification from './en/grid-classification.json';
import huGridClassification from './hu/grid-classification.json';
import enHome from './en/home.json';
import huHome from './hu/home.json';
import enMonotony from './en/monotony.json';
import huMonotony from './hu/monotony.json';
import enMotionPlanning from './en/motion-planning.json';
import huMotionPlanning from './hu/motion-planning.json';
import enNumericalCompanies from './en/numerical-companies.json';
import huNumericalCompanies from './hu/numerical-companies.json';
import enNumericalData from './en/numerical-data.json';
import huNumericalData from './hu/numerical-data.json';
import enNumericalInstructions from './en/numerical-instructions.json';
import huNumericalInstructions from './hu/numerical-instructions.json';
import enNumericalReasoning from './en/numerical-reasoning.json';
import huNumericalReasoning from './hu/numerical-reasoning.json';
import enNumericalStatements from './en/numerical-statements.json';
import huNumericalStatements from './hu/numerical-statements.json';
import enOddOneOut from './en/odd-one-out.json';
import huOddOneOut from './hu/odd-one-out.json';
import enPerception from './en/perception.json';
import huPerception from './hu/perception.json';
import enReactionTime from './en/reaction-time.json';
import huReactionTime from './hu/reaction-time.json';
import enSharedAccessibility from './en/shared-accessibility.json';
import huSharedAccessibility from './hu/shared-accessibility.json';
import enSharedActions from './en/shared-actions.json';
import huSharedActions from './hu/shared-actions.json';
import enSharedBusiness from './en/shared-business.json';
import huSharedBusiness from './hu/shared-business.json';
import enSharedCoordinationInstructions from './en/shared-coordination-instructions.json';
import huSharedCoordinationInstructions from './hu/shared-coordination-instructions.json';
import enSharedHelp from './en/shared-help.json';
import huSharedHelp from './hu/shared-help.json';
import enSharedInstructions from './en/shared-instructions.json';
import huSharedInstructions from './hu/shared-instructions.json';
import enSharedLabels from './en/shared-labels.json';
import huSharedLabels from './hu/shared-labels.json';
import enSharedReasoningInstructions from './en/shared-reasoning-instructions.json';
import huSharedReasoningInstructions from './hu/shared-reasoning-instructions.json';
import enSharedResults from './en/shared-results.json';
import huSharedResults from './hu/shared-results.json';
import enSharedSettings from './en/shared-settings.json';
import huSharedSettings from './hu/shared-settings.json';
import enSharedSymbols from './en/shared-symbols.json';
import huSharedSymbols from './hu/shared-symbols.json';
import enShortTermMemory from './en/short-term-memory.json';
import huShortTermMemory from './hu/short-term-memory.json';
import enSwitchReasoning from './en/switch-reasoning.json';
import huSwitchReasoning from './hu/switch-reasoning.json';
import enTestNames from './en/test-names.json';
import huTestNames from './hu/test-names.json';
import enTowerOfHanoi from './en/tower-of-hanoi.json';
import huTowerOfHanoi from './hu/tower-of-hanoi.json';
import enWorkingMemory from './en/working-memory.json';
import huWorkingMemory from './hu/working-memory.json';

function mergeSections(
  target: Record<string, unknown>,
  section: Record<string, unknown>,
) {
  for (const [key, value] of Object.entries(section)) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const existing = target[key];
      const nested =
        existing && typeof existing === 'object'
          ? (existing as Record<string, unknown>)
          : {};
      target[key] = nested;
      mergeSections(nested, value as Record<string, unknown>);
    } else target[key] = value;
  }
  return target;
}
export const resources = {
  en: {
    translation: [
      enCapacityToAct,
      enCommon,
      enConcentration,
      enCreateMonotonyPdf,
      enDeductiveReasoning,
      enDigitChallenge,
      enDistributiveAttention,
      enDividedAttention,
      enGreenGreyClassification,
      enGridClassification,
      enHome,
      enMonotony,
      enMotionPlanning,
      enNumericalCompanies,
      enNumericalData,
      enNumericalInstructions,
      enNumericalReasoning,
      enNumericalStatements,
      enOddOneOut,
      enPerception,
      enReactionTime,
      enSharedAccessibility,
      enSharedActions,
      enSharedBusiness,
      enSharedCoordinationInstructions,
      enSharedHelp,
      enSharedInstructions,
      enSharedLabels,
      enSharedReasoningInstructions,
      enSharedResults,
      enSharedSettings,
      enSharedSymbols,
      enShortTermMemory,
      enSwitchReasoning,
      enTestNames,
      enTowerOfHanoi,
      enWorkingMemory,
    ].reduce(
      (result, section) => mergeSections(result, section),
      {} as Record<string, unknown>,
    ),
  },
  hu: {
    translation: [
      huCapacityToAct,
      huCommon,
      huConcentration,
      huCreateMonotonyPdf,
      huDeductiveReasoning,
      huDigitChallenge,
      huDistributiveAttention,
      huDividedAttention,
      huGreenGreyClassification,
      huGridClassification,
      huHome,
      huMonotony,
      huMotionPlanning,
      huNumericalCompanies,
      huNumericalData,
      huNumericalInstructions,
      huNumericalReasoning,
      huNumericalStatements,
      huOddOneOut,
      huPerception,
      huReactionTime,
      huSharedAccessibility,
      huSharedActions,
      huSharedBusiness,
      huSharedCoordinationInstructions,
      huSharedHelp,
      huSharedInstructions,
      huSharedLabels,
      huSharedReasoningInstructions,
      huSharedResults,
      huSharedSettings,
      huSharedSymbols,
      huShortTermMemory,
      huSwitchReasoning,
      huTestNames,
      huTowerOfHanoi,
      huWorkingMemory,
    ].reduce(
      (result, section) => mergeSections(result, section),
      {} as Record<string, unknown>,
    ),
  },
};
