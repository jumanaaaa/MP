import React from "react";
import { Route, Routes } from "react-router-dom";
import Login from "./components/login";
import ForgetPassword from './components/forgetpassword';
// import Sidebar from './components/sidebar';
import LayoutWithSidebar from './components/layoutwithsidebar';
import AdminDashboard from "./components/admindashboard";
import { SidebarProvider } from './context/sidebarcontext';
import AdminTeamCapacity from "./components/adminteamcapacity";
import AdminUtilization from "./components/adminutilization";
import AdminActuals from "./components/adminactuals";
import AdminViewLogs from "./components/adminviewlogs";
import AdminViewPlan from "./components/adminviewplan";
import AdminIndividualPlan from "./components/adminindividualplan";
import AdminApprovals from "./components/adminapprovals";
import AdminAddPlan from "./components/adminaddplan";
import AdminAddIndividualPlan from "./components/adminaddindividualplan";
import AdminEditPlan from "./components/admineditplan";
import AdminEditIndividualPlan from "./components/admineditindividualplan";
import AdminReports from "./components/adminreports";
import UsersManagementPage from "./components/users";
import AddUserPage from "./components/addusers";
import AdminAlertsPage from "./components/adminalerts";
import AdminProfilePage from "./components/adminprofile";


const App = () => {
  return (

    <div>
      <SidebarProvider>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/forgot-password" element={<ForgetPassword />} />
          {/* Admin Routes */}
          <Route path="/admindashboard" element={
            <LayoutWithSidebar>
              <AdminDashboard />
            </LayoutWithSidebar>} />
          <Route path="/adminteamcapacity" element={
            <LayoutWithSidebar>
              <AdminTeamCapacity />
            </LayoutWithSidebar>
          } />
          <Route path="/adminutilization" element={
            <LayoutWithSidebar>
              <AdminUtilization />
            </LayoutWithSidebar>
          } />
          <Route path="/adminactuals" element={
            <LayoutWithSidebar>
              <AdminActuals />
            </LayoutWithSidebar>
          } />
          <Route path="/adminviewlogs" element={
            <LayoutWithSidebar>
              <AdminViewLogs />
            </LayoutWithSidebar>
          } />
          <Route path="/adminviewplan" element={
            <LayoutWithSidebar>
              <AdminViewPlan />
            </LayoutWithSidebar>
          } />
          <Route path="/adminindividualplan" element={
            <LayoutWithSidebar>
              <AdminIndividualPlan />
            </LayoutWithSidebar>
          } />
          <Route path="/adminapprovals" element={
            <LayoutWithSidebar>
              <AdminApprovals />
            </LayoutWithSidebar>
          } />
          <Route path="/adminaddplan" element={
            <LayoutWithSidebar>
              <AdminAddPlan />
            </LayoutWithSidebar>
          } />
          <Route path="/adminaddindividualplan" element={
            <LayoutWithSidebar>
              <AdminAddIndividualPlan />
            </LayoutWithSidebar>
          } />
          <Route path="/admineditplan" element={
            <LayoutWithSidebar>
              <AdminEditPlan />
            </LayoutWithSidebar>
          } />
          <Route path="/admineditindividualplan" element={
            <LayoutWithSidebar>
              <AdminEditIndividualPlan />
            </LayoutWithSidebar>
          } />
          <Route path="/adminreports" element={
            <LayoutWithSidebar>
              <AdminReports />
            </LayoutWithSidebar>
          } />
          <Route path="/users" element={
            <LayoutWithSidebar>
              <UsersManagementPage />
            </LayoutWithSidebar>
          } />
          <Route path="/addusers" element={
            <LayoutWithSidebar>
              <AddUserPage />
            </LayoutWithSidebar>
          } />
          <Route path="/adminalerts" element={
            <LayoutWithSidebar>
              <AdminAlertsPage />
            </LayoutWithSidebar>
          } />
          <Route path="/adminprofile" element={
            <LayoutWithSidebar>
              <AdminProfilePage />
            </LayoutWithSidebar>
          } />


          {/* User Routes */}
          {/* <Route
        path="/userdashboard"
        element={
          <LayoutWithSidebar>
            <UserDashboard />
          </LayoutWithSidebar>
        }
      /> */}

        </Routes>
      </SidebarProvider>
    </div>
  );
};

export default App;