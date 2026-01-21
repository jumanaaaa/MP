import React from "react";
import { Route, Routes } from "react-router-dom";
import LoginGate from "./components/LoginGate";
import ForgetPassword from './components/forgetpassword';
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
import AuthRedirect from "./components/AuthRedirect";
import SecretDepartmentsPage from "./components/SecretDepartmentsPage";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <div>
      <SidebarProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<LoginGate />} />
          <Route path="/forgot-password" element={<ForgetPassword />} />
          <Route path="/auth" element={<AuthRedirect />} />

          {/* Protected routes - accessible to all authenticated users */}
          <Route 
            path="/admindashboard" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminDashboard /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminteamcapacity" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminTeamCapacity /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminutilization" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminUtilization /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminactuals" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminActuals /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminviewlogs" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminViewLogs /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminviewplan" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminViewPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminindividualplan" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminIndividualPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminapprovals" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminApprovals /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminaddplan" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminAddPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminaddindividualplan" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminAddIndividualPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admineditplan" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminEditPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admineditindividualplan" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminEditIndividualPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admineditindividualplan/:id" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminEditIndividualPlan /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminreports" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminReports /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminalerts" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminAlertsPage /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/adminprofile" 
            element={
              <ProtectedRoute>
                <LayoutWithSidebar><AdminProfilePage /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />

          {/* Admin-only routes */}
          <Route 
            path="/users" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LayoutWithSidebar><UsersManagementPage /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/addusers" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LayoutWithSidebar><AddUserPage /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/secret" 
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <LayoutWithSidebar><SecretDepartmentsPage /></LayoutWithSidebar>
              </ProtectedRoute>
            } 
          />
        </Routes>
      </SidebarProvider>
    </div>
  );
};

export default App;