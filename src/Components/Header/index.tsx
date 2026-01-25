import { GITHUB_URL } from "@/utils/constants";
import { getAppVersion } from "@/utils/utils";
import { useAuth } from "../../utils/Context/AuthContext/Context";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import ContentLoader from "react-content-loader";
import Dropdown, { MenuType } from "../Dropdown";
import NotionConnectModal from "../NotionModifyModal";

export default function Header({ imgSrc }: { imgSrc?: string }) {
  const { user, logout, isLoading } = useAuth();
  const [showModal, setModal] = useState(false);

  const menuList: MenuType[] = useMemo(
    (): MenuType[] => [
      {
        label: user?.email ?? "No email found",
        value: user?.email ?? "noemail",
        component: {
          type: "button",
          onClick: () => {
            // dummy on click
          },
        },
      },
      {
        label: "Modify Notion Connection",
        value: "modifynotionsettings",
        component: {
          type: "button",
          onClick() {
            setModal(true);
          },
        },
      },

      {
        label: "Github",
        value: "github",
        component: {
          type: "link",
          href: GITHUB_URL,
        },
      },
      {
        label: "Privacy Policy",
        value: "privacypolicy",
        component: {
          type: "link",
          href: "/privacy",
        },
      },
      {
        label: "Terms and Conditions",
        value: "terms",
        component: {
          type: "link",
          href: "/terms",
        },
      },
      {
        style: "text-red-600",
        label: "Sign out",
        value: "signout",
        component: {
          type: "button",
          onClick: () => {
            logout();
          },
        },
      },
    ],
    [user?.email]
  );

  return (
    <div className="relative flex w-full items-center justify-center px-4 py-2 min-h-[80px]">
      <h1 className="text-3xl font-extrabold leading-normal text-gray-700 md:text-4xl text-center">
        <Link href="/">
          <a>
            Pomodoro <span className="text-purple-300">Databases</span>
          </a>
        </Link>
      </h1>
      
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        {/* show dropdown if user logged in */}
        {isLoading ? (
          <div className="flex items-center gap-4">
            <div className="hidden flex-col items-end justify-center sm:flex">
              <ContentLoader
                height={20}
                width={100}
                viewBox="0 0 100 20"
                backgroundColor="#f3f3f3"
                foregroundColor="#ecebeb"
              >
                <rect x="0" y="0" rx="4" ry="4" width="100" height="20" />
              </ContentLoader>
            </div>
            <ContentLoader
              height={48}
              width={48}
              viewBox="0 0 48 48"
              backgroundColor="#f3f3f3"
              foregroundColor="#ecebeb"
            >
              <circle cx="24" cy="24" r="24" />
            </ContentLoader>
          </div>
        ) : (
          user && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-3 rounded-full bg-white p-1 pl-4 pr-1 shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
                 <div className="hidden flex-col items-end justify-center sm:flex">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                    {user?.username || "User"}
                  </span>
                </div>
                <div className="relative h-10 w-10 overflow-hidden rounded-full border-2 border-white shadow-sm dark:border-gray-700">
                  <Image
                    loading="lazy"
                    src={imgSrc ?? "https://picsum.photos/50"}
                    alt="Profile picture"
                    layout="fill"
                    objectFit="cover"
                  />
                </div>
                <div className="ml-1">
                  <Dropdown menuList={menuList} />
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {showModal && <NotionConnectModal setModal={setModal} />}
    </div>
  );
}
