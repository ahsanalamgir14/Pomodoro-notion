import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import React from "react";
import Modal from "../Modal";
import { useAuth } from "../../utils/Context/AuthContext/Context";
type Props = {
  setModal: (openModal: boolean) => void;
};

export default function NotionModifyModal({ setModal }: Props) {
  const { user } = useAuth();
  
  const handleOAuthClick = () => {
    // Generate a unique session ID for this OAuth flow
    const sessionId = `oauth_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Use user email if available, otherwise use the session ID
    const stateParam = user?.email || sessionId;
    
    const oauthUrl = `https://api.notion.com/v1/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_NOTION_AUTH_CLIENT_ID}&response_type=code&owner=user&state=${encodeURIComponent(stateParam)}`;
    window.location.href = oauthUrl;
  };
  
  return (
    <Modal
      confirmText="Modify"
      title="Modify Notion Connection"
      description="Make sure to keep selected your current databases. if
  you accidently deselect your current databases you may
  loose your time logs. You can add additional databases. Don't select pages as pages are not supported currently"
      onCancelClick={() => setModal(false)}
      onConfirmClick={handleOAuthClick}
      icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
    />
  );
}
