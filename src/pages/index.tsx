import React from "react";
import { trpc } from "../utils/trpc";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import ContentLoader from "react-content-loader";
import DatabaseCard from "../Components/DatabaseCard";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import NotionConnectModal from "../Components/NotionConnectModal";
import { NotionCache } from "../utils/notionCache";

function Home() {
  const [showModal, setModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cachedData, setCachedData] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | undefined>(undefined);
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [creatingDemo, setCreatingDemo] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState<string | null>(null);
  const createDemoWorkspace = async () => {
    try {
      setCreatingDemo(true);
      const userId = (NotionCache.getUserData()?.email) || sessionEmail || 'notion-user';
      const resp = await fetch('/api/notion/create-demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.error('Failed to create demo workspace', json);
        setErrorMessage(json?.error || 'Failed to create demo workspace');
        return;
      }
      if (json?.databases && json?.workspace) {
        setIsConnected(true);
      }
    } catch (e) {
      setErrorMessage('Failed to create demo workspace');
    } finally {
      setCreatingDemo(false);
    }
  };

  // Handle OAuth callback and cache data
  useEffect(() => {
    if (router.query.error) {
      setErrorMessage(decodeURIComponent(router.query.error as string));
      router.replace("/", undefined, { shallow: true });
      return;
    }
    
    // Handle successful OAuth callback (store token only, do not cache databases)
    if (router.query.notion_connected && router.query.cache_data) {
      try {
        const userData = JSON.parse(decodeURIComponent(router.query.cache_data as string));
        NotionCache.saveUserData(userData);
        setIsConnected(true);
        if (userData?.accessToken) {
          setAccessToken(userData.accessToken);
        }

        console.log('✅ Notion connection cached successfully');
        router.replace("/", undefined, { shallow: true });
      } catch (error) {
        console.error('❌ Failed to cache OAuth data:', error);
      }
      return;
    }
  }, [router.query, router.isReady]);

  // Fetch session email to scope Notion queries to the logged-in user
  useEffect(() => {
    let mounted = true;
    fetch('/api/session')
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        if (data?.isAuthenticated) {
          setSessionEmail(data?.email || null);
        } else {
          setSessionEmail(null);
        }
      })
      .catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  // Check connection status - check both local cache and server
  const checkConnectionStatus = async () => {
    try {
      // First, check local cache for immediate feedback
      const cachedUserData = NotionCache.getUserData();
      if (cachedUserData?.accessToken) {
        // If we have cached data, optimistically set as connected
        setIsConnected(true);
        setAccessToken(cachedUserData.accessToken);
      }

      // Then verify with server
      const response = await fetch('/api/user/identifier');
      const data = await response.json();
      
      if (data?.resolvedUserId) {
        setResolvedUserId(data.resolvedUserId);
      }
      
      // Server has the final say on connection status
      if (typeof data?.hasToken === 'boolean') {
        setIsConnected(!!data.hasToken);
        if (data.hasToken) {
          // If server confirms connection, ensure we have the token
          const cached = NotionCache.getUserData();
          if (cached?.accessToken) {
            setAccessToken(cached.accessToken);
          } else if (data?.resolvedUserId) {
            // If no cache but server says connected, token is on server side
            // The API calls will fetch it from server using email
            setIsConnected(true);
          }
        }
      } else if (cachedUserData?.accessToken) {
        // If server check failed but we have cache, keep connection
        // This handles cases where server is temporarily unavailable
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
      // On error, fall back to cache if available
      const cached = NotionCache.getUserData();
      if (cached?.accessToken) {
        setIsConnected(true);
        setAccessToken(cached.accessToken);
      }
    }
  };

  // Check connection on mount
  useEffect(() => {
    let mounted = true;
    checkConnectionStatus().then(() => {
      if (!mounted) return;
    });
    return () => { mounted = false; };
  }, []);

  // Re-check connection status periodically and on window focus
  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const handleFocus = () => {
      if (mounted) {
        checkConnectionStatus();
      }
    };

    // Check every 5 minutes to ensure connection persists
    intervalId = setInterval(() => {
      if (mounted) {
        checkConnectionStatus();
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Also check when window regains focus
    window.addEventListener('focus', handleFocus);

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  // Use server-resolved identifier or session email only; never use demo identifier
  const userIdentifier = (resolvedUserId && resolvedUserId !== "notion-user")
    ? resolvedUserId
    : (sessionEmail || "");
  
  const shouldFetch = isConnected && !!userIdentifier;
  
  const { data, isFetching, error, refetch } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier, accessToken },
    {
      refetchOnWindowFocus: false,
      retry: false, // Don't retry on error
      enabled: shouldFetch, // Only fetch when connected
    }
  );

  // Check for connection errors that should be displayed to user
  const connectionError = error && (
    error.message?.includes("Connection to Notion was interrupted") ||
    error.message?.includes("Request to Notion timed out") ||
    error.message?.includes("Connection to Notion was lost") ||
    error.message?.includes("socket hang up")
  );

  // Check if user needs to connect to Notion
  const isUnauthorized = !isConnected;
  
  // Always use fresh API data
  const displayData = data;
  
  // Show databases view only when connected
  const shouldShowDatabases = isConnected && (!!displayData || isFetching);
  
  // Single source of truth for loading state
  const isLoadingDatabases = isFetching && !displayData;

  return (
    <div className="container mx-auto flex min-h-screen flex-col items-center p-4">
      {shouldShowDatabases ? (
        <div>
          <Header imgSrc={displayData?.workspace?.workspace_icon ?? null} />
          {isLoadingDatabases && (
            <div className="mt-8 text-center">
              <div className="text-lg text-gray-600 mb-4">Loading your databases...</div>
              <ContentLoader
                className="mx-auto"
                height={100}
                width={160}
                viewBox="0 0 160 100"
              >
                <rect x="0" y="0" rx="5" ry="5" width="160" height="100" />
              </ContentLoader>
            </div>
          )}
          {displayData && (
            <div className="mt-4 flex items-center justify-center gap-4">
              <button
                onClick={() => {
                  refetch();
                }}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Refresh databases
              </button>
              <a
                href="/embed"
                className="text-sm rounded bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-500"
              >
                Create Embed
              </a>
                <button
                  onClick={async () => {
                    try {
                      setDisconnectMsg(null);
                      const payloadEmail = (resolvedUserId && resolvedUserId !== 'notion-user') ? resolvedUserId : (sessionEmail || null);
                      const resp = await fetch('/api/notion/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: payloadEmail }) });
                      if (!resp.ok) {
                        const json = await resp.json().catch(() => ({}));
                        setDisconnectMsg(json?.error || 'Failed to disconnect');
                        return;
                      }
                    NotionCache.clearUserData();
                    NotionCache.clearDatabaseCache();
                    setIsConnected(false);
                    setCachedData(null);
                    setDisconnectMsg('Disconnected');
                  } catch {
                    setDisconnectMsg('Failed to disconnect');
                  }
                }}
                className="text-sm text-red-600 hover:text-red-800 underline"
              >
                Disconnect
              </button>
            </div>
          )}
          {disconnectMsg && (
            <div className="mt-2 text-sm text-gray-700 text-center">{disconnectMsg}</div>
          )}
          {displayData?.databases?.results && displayData?.databases.results.length > 0 ? (
            <div className="mt-3 grid gap-3 pt-3 text-center md:grid-cols-3 lg:w-2/3 mx-auto">
              {displayData.databases.results.map((d) => (
                <DatabaseCard
                  key={d.id}
                  title={(d.title && d?.title[0]?.text?.content) || "Unkown"}
                  description={
                    (d.description &&
                      d.description?.length > 0 &&
                      JSON.stringify(d.description)) ||
                    "No description"
                  }
                  databasehref={`database/${d.id}`}
                  pomodorohref={`pomodoro/${d.id}`}
                />
              ))}
            </div>
          ) : (
            !isFetching && displayData && (
              <div>
                <h2 className="w-100 mt-10 text-center text-4xl leading-normal text-gray-500">
                  No databases found
                </h2>
                <p className="mt-4 text-center text-gray-600">
                  Try refreshing or check Notion permissions for databases.
                </p>
                <div className="mt-8 w-full max-w-2xl border rounded-md p-4">
                  <div className="text-center text-gray-700 font-medium mb-3">Manual Notion setup</div>
                  <div className="flex items-center justify-center gap-4">
                    <div className="rounded-md border px-3 py-2">Adventure</div>
                    <div>↔</div>
                    <div className="rounded-md border px-3 py-2">Quests</div>
                    <div>↔</div>
                    <div className="rounded-md border px-3 py-2">Time Tracking</div>
                  </div>
                  <div className="mt-3 text-center text-sm text-gray-600">
                    Adventure links to Quests; Quests link to Time Tracking
                  </div>
                  <div className="mt-4 text-sm text-gray-700">
                    <div className="font-medium mb-2 text-center">Create these databases in Notion:</div>
                    <ul className="list-disc pl-5 space-y-1 text-left">
                      <li>Quests: Name (title), Status (select), Start Date (date), Due Date (date)</li>
                      <li>Time Tracking: Name, Status, Start Time, End Time, Duration (number), Notes (rich_text), Tags (multi_select), Quests (relation → Quests)</li>
                      <li>Adventure: Name, Status, Tags, Quests (relation → Quests)</li>
                    </ul>
                    <div className="mt-2">
                      Then open each database → Share → invite your integration.
                    </div>
                  </div>
                </div>
                <section className="mt-10">
                  <Footer showCredit={false} />
                </section>
              </div>
            )
          )}
        </div>
      ) : (
        <div>
          <Header imgSrc={null} />
          {(errorMessage || connectionError) && (
            <div className="mt-4 w-full max-w-md rounded-md bg-red-50 p-4 border border-red-200">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Connection Error
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    {errorMessage || (connectionError ? error?.message : "")}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setErrorMessage(null);
                  // For connection errors, we can suggest retrying
                  if (connectionError) {
                    window.location.reload();
                  }
                }}
                className="mt-2 text-sm text-red-600 hover:text-red-500"
              >
                {connectionError ? "Retry" : "Dismiss"}
              </button>
            </div>
          )}
          <h2 className="w-100 mt-10 text-center text-4xl leading-normal text-gray-500">
            Connect to Notion
          </h2>
          <p className="mt-4 text-center text-gray-600">
            Please connect your Notion account to access your databases
          </p>
          <div className="mt-5 flex justify-center">
            <button
              onClick={() => setModal(true)}
              className="rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700"
            >
              Connect Notion
            </button>
          </div>
          <section className="mt-10">
            <Footer />
          </section>
          {showModal && <NotionConnectModal setModal={setModal} />}
        </div>
      )}
    </div>
  );
}

export default Home;

export async function getServerSideProps(ctx: any) {
  const cookieHeader = ctx.req?.headers?.cookie || "";
  const cookies = Object.fromEntries((cookieHeader || "").split(";").map((c: string) => {
    const [k, v] = c.trim().split("=");
    return [k, v];
  }));
  const hasNextAuth = cookies["next-auth.session-token"] || cookies["__Secure-next-auth.session-token"];
  const hasJwt = cookies["session_token"];
  const hasLegacy = cookies["session_user"];
  const isAuthenticated = !!(hasNextAuth || hasJwt || hasLegacy);
  if (!isAuthenticated) {
    const dest = "/login?redirect=" + encodeURIComponent(ctx.resolvedUrl || "/");
    return { redirect: { destination: dest, permanent: false } };
  }
  return { props: {} };
}
