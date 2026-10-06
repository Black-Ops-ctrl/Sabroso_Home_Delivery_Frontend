import Modal from "./Modal";

export default function ConfirmDelete({ what, note, busy, onClose, onConfirm }) {
  return (
    <Modal
      title={`Delete ${what}?`}
      cls="modal--confirm-grad"
      submit="Delete"
      danger
      busy={busy}
      onClose={onClose}
      onSubmit={onConfirm}
    >
      <p className="sub">
        {note || "The record and its links in the catalogue will be removed."}
      </p>
    </Modal>
  );
}
