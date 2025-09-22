import { trpc } from "@/utils/trpc";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Footer from "../Components/Footer";
import Header from "../Components/Header";
import NotionConnectModal from "../Components/NotionConnectModal";
import ContentLoader from "react-content-loader";

function Home() {
  const [showModal, setModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();

  // Handle error messages from OAuth callback
  useEffect(() => {
    if (router.query.error) {
      setErrorMessage(decodeURIComponent(router.query.error as string));
      // Clear the error from URL
      router.replace("/", undefined, { shallow: true });
    }
  }, [router]);

  // Use a simple identifier for Notion connection - no user accounts needed
  const userIdentifier = "notion-user";
  
  const { data, isFetching, error } = trpc.private.getDatabases.useQuery(
    { email: userIdentifier },
    {
      refetchOnWindowFocus: false,
      retry: false, // Don't retry on error
      enabled: true, // Always try to fetch
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
  const isUnauthorized = 
    // Case 1: TRPC error (401 from Notion API)
    (error?.message?.includes("Request failed with status code 401")) ||
    // Case 2: Successful response but no user data/token
    (data?.error && data.error.includes("User not found or not connected to Notion")) ||
    // Case 3: No data and no specific error (initial state)
    (!data && !error && !isFetching);

  return (
    <>
      <main className="container mx-auto flex min-h-screen flex-col items-center  p-4">
        {isFetching && (
          <div>
            <ContentLoader
              className="mt-2"
              height={100}
              width={160}
              viewBox="0 0 160 100"
            >
              <rect x="0" y="0" rx="5" ry="5" width="160" height="100" />
            </ContentLoader>
            <ContentLoader
              className="mt-2"
              height={100}
              width={160}
              viewBox="0 0 160 100"
            >
              <rect x="0" y="0" rx="5" ry="5" width="160" height="100" />
            </ContentLoader>
          </div>
        )}
        {!isFetching && (isUnauthorized || !data) && (
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
        {!isFetching && data && !isUnauthorized && (
          <>
            <Header imgSrc={data?.workspace?.workspace_icon} />

            {data?.databases?.results && data?.databases.results.length > 0 ? (
              <div className="mt-3 grid gap-3 pt-3 text-center md:grid-cols-3 lg:w-2/3">
                {data.databases.results.map((d) => (
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
              <>
                <h2 className="w-100 mt-10 text-center text-4xl leading-normal text-gray-500">
                  No Database found
                </h2>
                <button
                  onClick={() => setModal(true)}
                  className="mt-5 rounded bg-blue-500 py-2 px-4 font-bold text-white hover:bg-blue-700"
                >
                  Add Notion
                </button>
                <section className="mt-10">
                  <Footer />
                </section>
                {showModal && <NotionConnectModal setModal={setModal} />}
              </>
            )}
          </>
        )}
      </main>
    </>
  );
}

export default Home;

type DatabaseProps = {
  title: string;
  description: string;
  databasehref: string;
  pomodorohref: string;
};

const DatabaseCard = ({
  title,
  description,
  databasehref,
  pomodorohref,
}: DatabaseProps) => {
  return (
    <Link href={pomodorohref}>
      <section className="flex cursor-pointer flex-col justify-center rounded-md border-2 border-gray-500 p-6 shadow-xl duration-500 motion-safe:hover:scale-105">
        <h2 className="text-lg text-gray-700">{title}</h2>
        <p className="text-sm text-gray-600">{description}</p>
        <Link href={pomodorohref}>
          <button className="mt-5 rounded-md bg-gray-600 py-2 px-4 text-gray-200  hover:bg-gray-700">
            Pomodoro
          </button>
        </Link>
      </section>
    </Link>
  );
};
