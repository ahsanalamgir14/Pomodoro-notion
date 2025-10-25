import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import React from "react";
import Modal from "../Modal";

type Props = {
  setModal: (openModal: boolean) => void;
};

export default function NotionConnectModal({ setModal }: Props) {
  const handleOAuthClick = () => {
    // Use a simple identifier for Notion connection - no user accounts needed
    const stateParam = "notion-user";
    
    const oauthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_NOTION_AUTH_CLIENT_ID}&response_type=code&owner=user&state=${encodeURIComponent(stateParam)}`;
    
    console.log('OAuth URL:', oauthUrl);
    console.log('Client ID:', process.env.NEXT_PUBLIC_NOTION_AUTH_CLIENT_ID);
    console.log('Redirect URI:', process.env.NEXT_PUBLIC_NOTION_AUTH_REDIRECT_URI);
    console.log('State param:', stateParam);
    
    window.location.href = oauthUrl;
  };
  
  return (
    <Modal
      confirmText="Add"
      title="Add notion connection"
      description="Make sure to Only select databases as pages are currently not supported"
      onCancelClick={() => setModal(false)}
      onConfirmClick={handleOAuthClick}
      icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
    />
  );
}
