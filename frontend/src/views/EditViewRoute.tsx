/**
 * Edit view for a tile.
 * Route: /tile/:id/edit
 */
import type { ReactElement } from "react";
import { useParams } from "react-router-dom";
import { EditView } from "./EditView.jsx";

export function EditViewRoute(): ReactElement | null {
  const { id } = useParams<"id">();
  if (!id) return null;
  return <EditView shaderId={id} />;
}
