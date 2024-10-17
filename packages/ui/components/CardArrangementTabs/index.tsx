import { useTranslations } from "next-intl";
import { TCardArrangementOptions } from "@formbricks/types/styling";
import { TSurveyType } from "@formbricks/types/surveys/types";
import { Tabs } from "../Tabs";
import { CasualCardArrangementIcon } from "../icons/CasualCardArrangementIcon";
import { SimpleCardsArrangementIcon } from "../icons/SimpleCardArrangementIcon";
import { StraightCardArrangementIcon } from "../icons/StraightCardArrangementIcon";

interface CardArrangementTabsProps {
  surveyType: TSurveyType;
  activeCardArrangement: TCardArrangementOptions;
  setActiveCardArrangement: (arrangement: TCardArrangementOptions, surveyType: TSurveyType) => void;
  disabled?: boolean;
}

export const CardArrangementTabs = ({
  activeCardArrangement,
  surveyType,
  setActiveCardArrangement,
  disabled = false,
}: CardArrangementTabsProps) => {
  const t = useTranslations();
  const handleCardArrangementChange = (arrangement: TCardArrangementOptions) => {
    if (disabled) return;
    setActiveCardArrangement(arrangement, surveyType);
  };

  const getCardArrangementIcon = (cardArrangement: string) => {
    switch (cardArrangement) {
      case "casual":
        return <CasualCardArrangementIcon />;
      case "straight":
        return <StraightCardArrangementIcon />;
      default:
        return <SimpleCardsArrangementIcon />;
    }
  };

  return (
    <div className="w-full gap-2 rounded-md bg-white">
      <Tabs
        id="card-arrangement"
        onChange={(value) => {
          handleCardArrangementChange(value);
        }}
        options={[
          {
            value: "casual",
            label: t("environments.surveys.edit.casual"),
            icon: getCardArrangementIcon("casual"),
          },
          {
            value: "straight",
            label: t("environments.surveys.edit.straight"),
            icon: getCardArrangementIcon("straight"),
          },
          {
            value: "simple",
            label: t("environments.surveys.edit.simple"),
            icon: getCardArrangementIcon("simple"),
          },
        ]}
        defaultSelected={activeCardArrangement}
        className="w-full"
        tabsContainerClassName="p-1 gap-2"
      />
    </div>
  );
};
