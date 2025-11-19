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
  const router = useRouter();
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  // Handle OAuth callback and cache data
  useEffect(() => {
    if (router.query.error) {
      setErrorMessage(decodeURIComponent(router.query.error as string));
      router.replace("/", undefined, { shallow: true });
      return;
    }
    
    // Handle successful OAuth callback
    if (router.query.notion_connected && router.query.cache_data) {
      try {
        const userData = JSON.parse(decodeURIComponent(router.query.cache_data as string));
        NotionCache.saveUserData(userData);
        setIsConnected(true);
        
        // Immediately check for cached database list after saving user data
        const cached = NotionCache.getCachedDatabaseList();
        if (cached) {
          setCachedData({
            databases: cached.databases,
            workspace: cached.workspace,
          });
          console.log('✅ Using cached database list after OAuth');
        }
        
        console.log('✅ Notion connection cached successfully');
        router.replace("/", undefined, { shallow: true });
      } catch (error) {
        console.error('❌ Failed to cache OAuth data:', error);
      }
      return;
    }
    
    // Check for existing cached connection on normal page load
    const connectionStatus = NotionCache.getConnectionStatus();
    console.log('🔍 Connection status check:', connectionStatus);
    
    if (connectionStatus.isConnected) {
      setIsConnected(true);
      
      // Try to use cached database list first
      const cached = NotionCache.getCachedDatabaseList();
      if (cached) {
        setCachedData({
          databases: cached.databases,
          workspace: cached.workspace,
        });
        console.log('✅ Using cached database list - no re-authentication needed');
      } else {
        console.log('⚠️ Connected but no cached database list - will fetch fresh data');
      }
    } else {
      console.log('❌ No cached connection found - user needs to connect');
      setIsConnected(false);
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
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  // Use a simple identifier for Notion connection - no user accounts needed
  const userIdentifier = sessionEmail || "notion-user";
  
  // Fetch when we have a session (cookie) or cached connection, and no cached data yet
  const shouldFetch = !cachedData && (!!sessionEmail || isConnected);
  
  const { data, isFetching, error } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier },
    {
      refetchOnWindowFocus: false,
      retry: false, // Don't retry on error
      enabled: shouldFetch, // Only fetch when needed
      onSuccess: (data) => {
        // Cache the fresh data
        if (data?.databases && data?.workspace) {
          NotionCache.saveDatabaseList(data.databases, data.workspace);
          console.log('✅ Fresh database list cached');
        }
      },
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
  
  // Use cached data if available, otherwise use fresh API data
  const displayData = cachedData || data;
  
  // Determine if we should show the databases (either we have data or we're currently fetching)
  const shouldShowDatabases = !!displayData || isFetching;
  
  // Single source of truth for loading state
  const isLoadingDatabases = isFetching && !displayData;

  return (
    <>
      <main className="container mx-auto flex min-h-screen flex-col items-center  p-4">
        {/* When not connected, show connect UI; loading only appears in the databases view */}
        {!shouldShowDatabases && (
          <>
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
            <button
              onClick={() => setModal(true)}
              className="mt-5 rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700"
            >
              Connect Notion
            </button>
            <section className="mt-10">
              <Footer />
            </section>
            {showModal && <NotionConnectModal setModal={setModal} />}
          </>
        )}
        {shouldShowDatabases && (
          <>
            <Header imgSrc={displayData?.workspace?.workspace_icon ?? null} />
            
            {/* Show loading state if we're connected but still fetching */}
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
            
            {/* Cache status and refresh button */}
            {displayData && (
              <div className="mt-4 flex items-center justify-center gap-4">
                {cachedData && (
                  <span className="text-sm text-green-600">
                    ✅ Using cached data (faster loading)
                  </span>
                )}
                <button
                  onClick={() => {
                    NotionCache.clearDatabaseCache();
                    setCachedData(null);
                    console.log('🔄 Cache cleared, will fetch fresh data');
                  }}
                  className="text-sm text-blue-600 hover:text-blue-800 underline"
                >
                  🔄 Refresh databases
                </button>
                <a
                  href="/embed"
                  className="text-sm rounded bg-indigo-600 px-3 py-1 font-medium text-white hover:bg-indigo-500"
                >
                  ➕ Create Embed
                </a>
                <button
                  onClick={() => {
                    NotionCache.clearUserData();
                    setIsConnected(false);
                    setCachedData(null);
                    console.log('🚪 Disconnected from Notion');
                  }}
                  className="text-sm text-red-600 hover:text-red-800 underline"
                >
                  🚪 Disconnect
                </button>
              </div>
            )}

            {displayData?.databases?.results && displayData?.databases.results.length > 0 ? (
              <div className="mt-3 grid gap-3 pt-3 text-center md:grid-cols-3 lg:w-2/3">
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
                <>
                  <h2 className="w-100 mt-10 text-center text-4xl leading-normal text-gray-500">
                    No databases found
                  </h2>
                  <p className="mt-4 text-center text-gray-600">
                    Try refreshing or check Notion permissions for databases.
                  </p>
                  <section className="mt-10">
                    <Footer showCredit={false} />
                  </section>
                </>
              )
            )}
          </>
        )}
      </main>
    </>
  );
}

export default Home;
