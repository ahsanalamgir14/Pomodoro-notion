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
      {
        label: `version: ${getAppVersion()}`,
        style: "text-slate-500",
        value: "appversion",
        component: {
          type: "text",
        },
      },
    ],
    [user?.email]
  );

  return (
    <div className="flex flex-row gap-10 sm:flex-row sm:justify-center">
      <h1 className="text-3xl font-extrabold leading-normal text-gray-700 md:text-[4rem]">
        <Link href="/">
          <a>
            Pomodoro <span className="text-purple-300">Databases</span> Notion
          </a>
        </Link>
      </h1>
      {/* show dropdown if user logged in */}
      {isLoading ? (
        <div>
          <div className="hidden flex-col items-center justify-center sm:flex ">
            <ContentLoader
              className="bg-red-50"
              height={20}
              width={89}
              viewBox="0 0 89 20"
            >
              <rect x="0" y="0" width={89} height={20} />
            </ContentLoader>
          </div>
          <ContentLoader
            className="mt-2"
            height={50}
            width={50}
            viewBox="0 0 50 50"
          >
            <rect x="0" y="0" rx="5" ry="5" width="50" height="50" />
          </ContentLoader>
          <ContentLoader
            className="mt-2"
            height={30}
            width={30}
            viewBox="0 0 30 30"
          >
            <rect x="0" y="0" rx="100" ry="100" width="30" height="30" />
          </ContentLoader>
        </div>
      ) : (
        user && (
          <div>
            <div className="hidden flex-col items-center justify-center sm:flex ">
              {user && user?.username} <br />
            </div>
            <Image
              loading="lazy"
              src={imgSrc ?? "https://picsum.photos/50"}
              alt="pic"
              width={50}
              height={50}
            />
            <div>
              <Dropdown menuList={menuList} />
            </div>
          </div>
        )
      )}

      {showModal && <NotionConnectModal setModal={setModal} />}
    </div>
  );
}
