import dynamic from "next/dynamic";
import PlaceHolderLoader from "../PlaceHolderLoader";
const Noises = dynamic(() => import("../Noises"), {
  loading: () => <PlaceHolderLoader />,
});
const Analytics = dynamic(() => import("../Analytics"), {
  loading: () => <PlaceHolderLoader />,
});
const Timer = dynamic(() => import("../Timer"), {
  loading: () => <PlaceHolderLoader />,
});

const Notes = dynamic(() => import("../Notes"), {
  loading: () => <PlaceHolderLoader />,
});

import { PieData } from "../PieChart";

export default function Views({
  activeTab,
  pieData,
  projectName = "Please select project",
  databaseId,
  selectedTags = [],
  selectedQuests = [],
  availableDatabases = [],
  projects = [],
  availableTags = [],
}: {
  activeTab: string;
  pieData: PieData[];
  projectName?: string;
  databaseId?: string;
  selectedTags?: Array<{
    label: string;
    value: string;
    color: string;
  }>;
  selectedQuests?: Array<{
    label: string;
    value: string;
  }>;
  availableDatabases?: Array<{
    id: string;
    title: string;
    icon?: string;
  }>;
  projects?: Array<{
    label: string;
    value: string;
  }>;
  availableTags?: Array<{
    label: string;
    value: string;
    color: string;
  }>;
}) {
  return (
    <div className="w-full min-h-screen">
      <div
        className={`${
          activeTab === "analytics" ? "block" : "hidden"
        } w-[100%]`}
      >
        <Analytics pieData={pieData} />
      </div>

      <div
        className={`${
          activeTab === "timer" ? "flex" : "hidden"
        } w-full items-center justify-center`}
      >
        <Timer 
          projectName={projectName}
          currentDatabaseId={databaseId}
          selectedTags={selectedTags}
          selectedQuests={selectedQuests}
          availableDatabases={availableDatabases}
          projects={projects}
          availableTags={availableTags}
        />
      </div>
      <div
        className={`${
          activeTab === "noise" ? "flex" : "hidden"
        } w-full items-center justify-center `}
      >
        <div className="w-full">
          <Noises />
        </div>
      </div>
      <div
        className={`${
          activeTab === "notes" ? "flex" : "hidden"
        } w-full items-center justify-center `}
      >
        <div className="w-full">
          <Notes />
        </div>
      </div>
    </div>
  );
}
