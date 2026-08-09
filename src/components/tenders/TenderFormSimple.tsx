import React from "react";
import { useNavigate, useParams } from "react-router-dom";

const TenderFormSimple: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);

  return (
    <div className="container mx-auto py-6">
      <h1>{isEditing ? "Edit Tender" : "Create New Tender"}</h1>
      <p>Tender ID: {id || "New"}</p>
      <button onClick={() => navigate("/dashboard/tenders")}>
        Back to Tenders
      </button>
    </div>
  );
};

export default TenderFormSimple;
