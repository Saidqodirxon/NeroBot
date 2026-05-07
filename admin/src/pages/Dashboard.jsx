import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "../components/Layout";
import PromoCodes from "./Groups";
import Stats from "./Stats";
import Users from "./UsersNew";
import Broadcast from "./Broadcast";
import Seasons from "./Seasons";
import RandomWinner from "./RandomWinner";
import Prizes from "./Prizes";
import Settings from "./Settings";
import MasterApplications from "./MasterApplications";
import Masters from "./Masters";
import MasterPrizeClaims from "./MasterPrizeClaims";

export default function Dashboard() {
  return (
    <Layout>
      <Routes>
        <Route index element={<Navigate to="stats" replace />} />
        <Route path="stats"        element={<Stats />} />
        <Route path="seasons"      element={<Seasons />} />
        <Route path="codes"        element={<PromoCodes />} />
        <Route path="users"        element={<Users />} />
        <Route path="prizes"       element={<Prizes />} />
        <Route path="winner"       element={<RandomWinner />} />
        <Route path="broadcast"    element={<Broadcast />} />
        <Route path="settings"     element={<Settings />} />
        <Route path="master-apps"  element={<MasterApplications />} />
        <Route path="masters"      element={<Masters />} />
        <Route path="prize-claims" element={<MasterPrizeClaims />} />
        <Route path="*"            element={<Navigate to="stats" replace />} />
      </Routes>
    </Layout>
  );
}
