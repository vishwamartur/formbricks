import { createI18nString } from "@formbricks/lib/i18n/utils";
import {
  TI18nString,
  TSurvey,
  TSurveyMultipleChoiceMultiQuestion,
  TSurveyMultipleChoiceSingleQuestion,
  TSurveyQuestion,
} from "@formbricks/types/surveys";

export const getChoiceIndex = (id: string, isChoice: boolean) => {
  if (!isChoice) return null;

  const parts = id.split("-");
  if (parts.length > 1) {
    return parseInt(parts[1], 10);
  }
  return null;
};

export const getChoiceLabel = (
  question: TSurveyQuestion,
  choiceIdx: number,
  surveyLanguageCodes: string[]
): TI18nString => {
  const choiceQuestion = question as TSurveyMultipleChoiceMultiQuestion | TSurveyMultipleChoiceSingleQuestion;
  return choiceQuestion.choices[choiceIdx]?.label || createI18nString("", surveyLanguageCodes);
};

export const getCardText = (
  survey: TSurvey,
  id: string,
  isThankYouCard: boolean,
  surveyLanguageCodes: string[]
): TI18nString => {
  const card = isThankYouCard ? survey.thankYouCard : survey.welcomeCard;
  return (card[id as keyof typeof card] as TI18nString) || createI18nString("", surveyLanguageCodes);
};

export const determineImageUploaderVisibility = (questionIdx: number, localSurvey: TSurvey) => {
  switch (questionIdx) {
    case localSurvey.questions.length: // Thank You Card
      console.log(!!localSurvey.thankYouCard.imageUrl || !!localSurvey.thankYouCard.videoUrl);
      return !!localSurvey.thankYouCard.imageUrl || !!localSurvey.thankYouCard.videoUrl;
    case -1: // Welcome Card
      return !!localSurvey.welcomeCard.fileUrl || !!localSurvey.welcomeCard.videoUrl;
    default:
      // Regular Survey Question
      const question = localSurvey.questions[questionIdx];
      return (!!question && !!question.imageUrl) || (!!question && !!question.videoUrl);
  }
};

export const getLabelById = (id: string) => {
  switch (id) {
    case "headline":
      return "Question";
    case "subheader":
      return "Description";
    case "placeholder":
      return "Placeholder";
    case "buttonLabel":
      return `"Next" Button Label`;
    case "backButtonLabel":
      return `"Back" Button Label`;
    case "lowerLabel":
      return "Lower Label";
    case "upperLabel":
      return "Upper Label";
    default:
      return "";
  }
};

export const getPlaceHolderById = (id: string) => {
  switch (id) {
    case "headline":
      return "Your question here. Recall information with @";
    case "subheader":
      return "Your description here. Recall information with @";
    default:
      return "";
  }
};
