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
import ProjectSelection from "@/Components/ProjectSelection";
import QuestSelection from "@/Components/QuestSelection";
import Tabs from "../../Components/Tabs";
import Views from "@/Components/Views";
import useFormattedData from "../../hooks/useFormattedData";
import { trpc } from "../../utils/trpc";
import {
  queryDatabase,
  retrieveDatabase,
  listDatabases,
} from "../../utils/apis/notion/database";
import { NotionCache } from "../../utils/notionCache";
import { fetchNotionUser } from "../../utils/apis/firebase/notionUser";
import { verifyJWT } from "../../utils/serverSide/jwt";
import { getServerSession } from "next-auth";
import { authOptions } from "../api/auth/[...nextauth]";
import { getProjectId, getProjectTitleSafe } from "../../utils/notionutils";
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
  const databaseId = query.databaseId as string;
  const tab = query.tab as string;
  try {
    console.log("Fetching Notion database data for:", databaseId);

    const session = await getServerSession(req as any, undefined as any, authOptions).catch(() => null);
    const cookieHeader = req?.headers?.cookie || "";
    const cookies = Object.fromEntries((cookieHeader || "").split(";").map((c: string) => { const [k,v] = c.trim().split("="); return [k,v]; }));
    const jwt = cookies["session_token"]; const secret = process.env.NEXTAUTH_SECRET || process.env.SESSION_SECRET || "dev-secret";
    const jwtPayload = jwt ? verifyJWT(jwt, secret) : null;
    const legacy = cookies["session_user"] ? decodeURIComponent(cookies["session_user"]) : null;
    const candidates = [session?.user?.email || null, (jwtPayload?.email as string) || null, legacy]
      .filter(Boolean)
      .filter((e) => e !== "notion-user") as string[];
    let token: string | null = null;
    for (const id of candidates) {
      const u = await fetchNotionUser(id);
      if (u?.accessToken) { token = u.accessToken; break; }
    }

    if (!token) {
      const emptyQuery: any = { object: "list", results: [] };
      const emptyDetail: any = { object: "database", id: databaseId, properties: {}, title: [] };
      return {
        props: {
          database: emptyQuery,
          db: emptyDetail,
          tab: tab || null,
          error: null,
          databaseId: databaseId,
          availableDatabases: [],
        },
      };
    }
    
    console.log("🔑 Access token found:", token.substring(0, 20) + "...");
    console.log("📡 Making real Notion API calls for database:", databaseId);
    
    // Use real Notion API calls with the user's access token
    const [database, db, dbList] = await Promise.all([
      queryDatabase(databaseId, true, token),
      retrieveDatabase(databaseId, true, token),
      listDatabases(true, token),
    ]);
    
    console.log("✅ Successfully fetched real Notion data");
    console.log("Database results count:", database.results?.length || 0);
    console.log("Database properties:", Object.keys(db.properties || {}));

    const availableDatabases = (dbList.results || []).map((d: any) => {
      const titleText = Array.isArray(d.title) && d.title.length > 0
        ? d.title.map((t: any) => t.plain_text || "").join("").trim()
        : "Untitled";
      let icon: string | undefined = undefined;
      if (d.icon?.type === "emoji") icon = d.icon.emoji;
      else if (d.icon?.type === "file") icon = "📄";
      else if (d.icon?.type === "external") icon = "🔗";

      return {
        id: d.id,
        title: titleText || "Untitled",
        // Next.js cannot serialize undefined; use null when icon is missing
        icon: icon ?? null,
      };
    });
    
    return {
      props: {
        database,
        db,
        tab: tab || null,
        error: null,
        databaseId: databaseId,
        availableDatabases,
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
        availableDatabases: [],
      },
    };
  }
};

export default function Pages({
  database: ssrDatabase,
  db: ssrDb,
  tab,
  error,
  databaseId,
  availableDatabases,
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
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | undefined>(() => {
    if (typeof window === 'undefined') return undefined;
    const cached = NotionCache.getUserData();
    return cached?.accessToken || undefined;
  });

  useEffect(() => {
    try {
      const cached = NotionCache.getUserData();
      if (cached?.accessToken) {
        setAccessToken(cached.accessToken);
      }
    } catch {}
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.isAuthenticated) setSessionEmail(data?.email || null);
        else setSessionEmail(null);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let mounted = true;
    fetch('/api/user/identifier')
      .then((r) => r.json())
      .then((d) => {
        if (!mounted) return;
        setResolvedUserId(d?.resolvedUserId || null);
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  const userIdentifier = (resolvedUserId && resolvedUserId !== 'notion-user')
    ? resolvedUserId
    : (sessionEmail || (typeof window !== 'undefined' ? (localStorage.getItem('notion_user_data') ? JSON.parse(localStorage.getItem('notion_user_data') as string)?.email : null) : null) || "");

  const { data: apiQuery, isFetching: fetchingQuery } = trpc.private.queryDatabase.useQuery(
    { databaseId, email: userIdentifier, accessToken },
    { enabled: !!userIdentifier && (!!accessToken || !!userIdentifier), refetchOnWindowFocus: false, retry: false }
  );
  const { data: apiDetail, isFetching: fetchingDetail } = trpc.private.getDatabaseDetail.useQuery(
    { databaseId, email: userIdentifier, accessToken },
    { enabled: !!userIdentifier && (!!accessToken || !!userIdentifier), refetchOnWindowFocus: false, retry: false }
  );
  const { data: apiList } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier, accessToken },
    { enabled: !!userIdentifier && (!!accessToken || !!userIdentifier), refetchOnWindowFocus: false, retry: false }
  );

  const database = apiQuery?.database || ssrDatabase;
  const db = apiDetail?.db || ssrDb;
  const loading = (fetchingQuery || fetchingDetail) && !apiQuery && !apiDetail;

  const availableDbList = useMemo(() => {
    const results: any[] = (apiList?.databases?.results || []) as any[];
    return results.map((d: any) => {
      const titleText = Array.isArray(d.title) && d.title.length > 0
        ? d.title.map((t: any) => t.plain_text || "").join("").trim()
        : "Untitled";
      let icon: string | undefined = undefined;
      if (d.icon?.type === "emoji") icon = d.icon.emoji;
      else if (d.icon?.type === "file") icon = "📄";
      else if (d.icon?.type === "external") icon = "🔗";
      return { id: d.id, title: titleText || "Untitled", icon: icon ?? null };
    });
  }, [apiList]);

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
  const tagPropName = useMemo(() => {
    const props: any = db?.properties || {};
    const explicit = props["Tags"]?.type === "multi_select" ? "Tags" : null;
    if (explicit) return explicit;
    const match = Object.entries(props).find(([, p]: any) => p?.type === "multi_select" && /tag/i.test(((p as any)?.name || "") as string))?.[0];
    if (match) return match as string;
    const first = Object.entries(props).find(([, p]: any) => p?.type === "multi_select")?.[0];
    return (first as string) || "";
  }, [db]);

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
                  project.properties?.[tagPropName as any]?.multi_select?.findIndex(
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
  }, [database?.results, selectedProperties, tagPropName]);

  const [piedata] = useFormattedData();

  const projects = useMemo(() => {
    return (
      database?.results
        .map((project) => {
          // filter project list based on tags selected
          if (
            selectedProperties.every(
              (sp) =>
                project.properties?.[tagPropName as any]?.multi_select?.findIndex(
                  (m) => m.id == sp.value
                ) != -1
            ) ||
            selectedProperties.length == 0
          )
            return {
              label: getProjectTitleSafe(project),
              value: getProjectId(project),
            };
          return null;
        })
        .filter(notEmpty) || []
    );
  }, [database?.results, selectedProperties, tagPropName]);

  const properties = useMemo(() => {
    const props: any = db?.properties || {};
    const opt = tagPropName ? (props?.[tagPropName] as any)?.multi_select?.options : undefined;
    if (Array.isArray(opt)) {
      return opt.map((prp: any) => ({ label: prp.name, value: prp.id, color: prp.color }));
    }
    return [];
  }, [db, tagPropName]);

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

  // Top-level Quests (relation) selection, shown below Project like Tags
  const [selectedQuestsTop, setSelectedQuestsTop] = useState<Array<{ label: string; value: string }>>([]);
  useEffect(() => {
    let mounted = true;
    const loadRelation = async () => {
      try {
        if (!project?.value || !userIdentifier) { setSelectedQuestsTop([]); return; }
        const params: any = { userId: userIdentifier, pageId: project.value, relationName: "Quests" };
        if (accessToken) params.accessToken = accessToken;
        const qs = new URLSearchParams(params);
        const resp = await fetch(`/api/notion/page-relations?${qs.toString()}`);
        if (!resp.ok) { setSelectedQuestsTop([]); return; }
        const json = await resp.json();
        const opts = (json?.items || []).map((i: any) => ({ label: i.title, value: i.id }));
        if (mounted) setSelectedQuestsTop(opts);
      } catch {
        if (mounted) setSelectedQuestsTop([]);
      }
    };
    loadRelation();
    return () => { mounted = false; };
  }, [project?.value, userIdentifier, accessToken]);

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
        {(!error && (!!accessToken || !!userIdentifier || (database?.results && database.results.length > 0))) ? (
          <>
            {/* Tabs */}
            <Tabs tabs={TabsOptions} activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Project and Tags selections */}
            <div className="w-full max-w-md mx-auto space-y-4">
              {/* Project selection first */}
              <div>
                <ProjectSelection
                  disabled={busyIndicator || loading}
                  value={project as any}
                  projects={projects as any}
                  handleSelect={onProjectSelect as any}
                />
              </div>

              {/* Quests (relation) selection below project, disabled until project selected */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quests (relation)</label>
                <QuestSelection
                  key={project?.value || "quest-select-top"}
                  disabled={busyIndicator || !project?.value}
                  projectId={project?.value || null}
                  values={selectedQuestsTop}
                  onChange={setSelectedQuestsTop}
                  relationName="Quests"
                />
              </div>

              {/* Tags selection with spacing below project */}
              <div>
                <NotionTags
                  options={properties}
                  disabled={busyIndicator || loading}
                  handleSelect={setProperties}
                  selectedOptions={selectedProperties}
                />
              </div>
            </div>

            {/* Views */}
            <Views
              activeTab={activeTab}
              pieData={piedata}
              projectName={project?.label || "Please select project"}
              databaseId={databaseId}
              selectedTags={selectedProperties}
              selectedQuests={selectedQuestsTop}
              availableDatabases={availableDbList.length > 0 ? availableDbList : availableDatabases}
              projects={projects}
              availableTags={properties}
            />
          </>
        ) : (
          <div className="text-sm text-gray-500">
            {loading ? 'Loading...' : 'Connect Notion to view this database.'}
          </div>
        )}
      </main>
    </>
  );
}
