import { ExclamationTriangleIcon } from "@heroicons/react/24/solid";
import React from "react";
import Modal from "../Modal";

type Props = {
  setModal: (openModal: boolean) => void;
  onConfirm: () => void;
};

export default function DisconnectConfirmModal({ setModal, onConfirm }: Props) {
  return (
    <Modal
      confirmText="Disconnect"
      title="Disconnect Notion"
      description="Are you sure you want to disconnect? This will stop all Notion integrations including embeds."
      onCancelClick={() => setModal(false)}
      onConfirmClick={() => {
        onConfirm();
        setModal(false);
      }}
      icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
    />
  );
}
