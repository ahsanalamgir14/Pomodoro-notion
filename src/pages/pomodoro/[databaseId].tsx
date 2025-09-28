import { ArrowLeftIcon } from "@heroicons/react/24/solid";
import { AxiosError } from "axios";
import { GetServerSidePropsContext, InferGetServerSidePropsType } from "next";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
// import { getSession } from "next-auth/react"; // Removed next-auth dependency
import { useEffect, useMemo, useState } from "react";
import Line from "../../Components/Line";
import NotionTags from "../../Components/NotionTags";

const ProjectSelection = dynamic(
  () => import("../../Components/ProjectSelection"),
  {
    loading: () => <div>Loading...</div>,
  }
);

import Tabs from "../../Components/Tabs";
const Views = dynamic(() => import("../../Components/Views"), {
  loading: () => <div>Loading...</div>,
});
import useFormattedData from "../../hooks/useFormattedData";
import {
  queryDatabase,
  retrieveDatabase,
} from "../../utils/apis/notion/database";
import { fetchNotionUser } from "../../utils/apis/firebase/mockUserNotion";
import { getProjectId, getProjectTitle } from "../../utils/notionutils";
import { actionTypes } from "../../utils/Context/PomoContext/reducer";
import { actionTypes as userActiontype } from "../../utils/Context/UserContext/reducer";
import { actionTypes as projActiontype } from "../../utils/Context/ProjectContext/reducer";
import { usePomoState } from "../../utils/Context/PomoContext/Context";
import { notEmpty } from "../../types/notEmpty";
// No authentication required - using mock data directly
import { useUserState } from "../../utils/Context/UserContext/Context";
import { useProjectState } from "@/utils/Context/ProjectContext/Context";
import { TabsOptions } from "../../Components/Views/utils";

export const getServerSideProps = async ({
  query,
  req,
}: GetServerSidePropsContext) => {
  try {
    const databaseId = query.databaseId as string;
    const tab = query.tab as string;
    
    console.log("Fetching real Notion database data for:", databaseId);
    
    // Get the user's access token from Firebase
    const userEmail = "notion-user"; // Use the same identifier as the OAuth flow
    console.log("🔍 Fetching user data for email:", userEmail);
    const userData = await fetchNotionUser(userEmail);
    
    if (!userData || !userData.accessToken) {
      console.log("❌ No user data or access token found, falling back to mock data");
      console.log("User data:", userData);
      const { mockDatabaseQuery, mockDatabaseDetail } = await import("../../utils/apis/notion/mockDatabase");
      
      return {
        props: {
          database: mockDatabaseQuery,
          db: mockDatabaseDetail,
          tab: tab || null,
          error: null,
          databaseId: databaseId,
        },
      };
    }
    
    console.log("🔑 Access token found:", userData.accessToken.substring(0, 20) + "...");
    console.log("📡 Making real Notion API calls for database:", databaseId);
    
    // Use real Notion API calls with the user's access token
    const [database, db] = await Promise.all([
      queryDatabase(databaseId, true, userData.accessToken),
      retrieveDatabase(databaseId, true, userData.accessToken)
    ]);
    
    console.log("✅ Successfully fetched real Notion data");
    console.log("Database results count:", database.results?.length || 0);
    console.log("Database properties:", Object.keys(db.properties || {}));
    
    return {
      props: {
        database,
        db,
        tab: tab || null,
        error: null,
        databaseId: databaseId,
      },
    };
  } catch (error) {
    console.log("❌ Error fetching real Notion data:", error);
    
    // Fallback to mock data if real API fails
    console.log("🔄 Falling back to mock data");
    const { mockDatabaseQuery, mockDatabaseDetail } = await import("../../utils/apis/notion/mockDatabase");
    
    return {
      props: {
        database: mockDatabaseQuery,
        db: mockDatabaseDetail,
        tab: tab || null,
        error: null,
        databaseId: query.databaseId as string,
      },
    };
  }
};

export default function Pages({
  database,
  db,
  tab,
  error,
  databaseId,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const router = useRouter();
  const [selectedProperties, setProperties] = useState<
    Array<{
      label: string;
      value: string;
      color: string;
    }>
  >([]);

  const [activeTab, setActiveTab] = useState(tab || TabsOptions[0]!.value);

  const [{ busyIndicator, project }, dispatch] = usePomoState();
  const [, userDispatch] = useUserState();
  const [, projectDispatch] = useProjectState();

  useEffect(() => {
    router.push(
      {
        query: {
          databaseId: router.query.databaseId,
          tab: activeTab,
        },
      },
      undefined,
      {
        shallow: true,
      }
    );
  }, [activeTab]);

  // No user authentication required - removed userId dependency

  useEffect(() => {
    if (databaseId)
      dispatch({
        type: actionTypes.SET_DATABASEID,
        payload: databaseId,
      });
  }, [databaseId]);

  useEffect(() => {
    if (database?.results) {
      const notionProjects =
        database?.results
          .map((project) => {
            // filter project list based on tags selected
            if (
              selectedProperties.every(
                (sp) =>
                  project.properties?.Tags?.multi_select?.findIndex(
                    (m) => m.id == sp.value
                  ) != -1
              ) ||
              selectedProperties.length == 0
            )
              return project;
            return null;
          })
          .filter(notEmpty) || [];
      projectDispatch({
        type: projActiontype.UPDATE_NOTION_PROJECTS,
        payload: notionProjects,
      });
    }
  }, [database?.results, selectedProperties]);

  const [piedata] = useFormattedData();

  const projects = useMemo(() => {
    return (
      database?.results
        .map((project) => {
          // filter project list based on tags selected
          if (
            selectedProperties.every(
              (sp) =>
                project.properties?.Tags?.multi_select?.findIndex(
                  (m) => m.id == sp.value
                ) != -1
            ) ||
            selectedProperties.length == 0
          )
            return {
              label: getProjectTitle(project),
              value: getProjectId(project),
            };
          return null;
        })
        .filter(notEmpty) || []
    );
  }, [database?.results, selectedProperties]);

  const properties = useMemo(() => {
    if (
      db?.properties &&
      db.properties.Tags?.multi_select &&
      db.properties.Tags.multi_select.options
    )
      return db?.properties?.Tags?.multi_select?.options.map((prp) => ({
        label: prp.name,
        value: prp.id,
        color: prp.color,
      }));
    else return [];
  }, []);

  const onProjectSelect = (proj: { label: string; value: string } | null) => {
    if (!proj)
      dispatch({
        type: actionTypes.RESET_TIMERS,
      });

    dispatch({
      type: actionTypes.SET_PROJECTID,
      payload: proj,
    });
    dispatch({
      type: actionTypes.FROZE_POMODORO,
      payload: !proj,
    });
  };

  return (
    <>
      <main className=" mx-auto flex  flex-col  items-center  p-4 ">
        <h2 className="flex items-center gap-5 text-4xl font-extrabold leading-normal text-gray-700">
          <Link href="/">
            <ArrowLeftIcon className="inline h-5 w-5 cursor-pointer text-gray-700 md:top-[45px] md:left-[-45px] md:h-[1.75rem] md:w-[1.75rem]" />
          </Link>
          <span>
            Pomo<span className="text-purple-300">doro</span>
          </span>
        </h2>
        <Line
          margin="10px 0px 10px 0px"
          height="1px"
          backgroundColor="#37415130"
          width="50%"
        />
        {!error ? (
          <>
            <Tabs
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              tabs={TabsOptions}
            />
            <div className="m-5">
              <ProjectSelection
                disabled={busyIndicator}
                value={project}
                handleSelect={onProjectSelect}
                projects={projects}
              />
            </div>
            <NotionTags
              disabled={busyIndicator}
              handleSelect={setProperties}
              options={properties}
            />
            <Views
              activeTab={activeTab}
              pieData={piedata}
              projectName={getProjectTitle(
                database?.results.find((pr) => pr.id == String(project?.value)),
                "Please select project"
              )}
              databaseId={databaseId}
              selectedTags={selectedProperties}
              availableDatabases={[]}
              projects={projects}
              availableTags={properties}
            />
          </>
        ) : (
          JSON.stringify(error)
        )}
      </main>
    </>
  );
}
