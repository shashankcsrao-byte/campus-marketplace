import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import MainLayout from './layouts/MainLayout';
import { retryImport } from './utils/chunkReload';
import ProtectedRoute from './routes/ProtectedRoute';
import GuestRoute from './routes/GuestRoute';
import Home from './pages/Home';

// Each page's code loads only when it's opened.
const Login = lazy(retryImport(() => import('./pages/Login')));
const Register = lazy(retryImport(() => import('./pages/Register')));
const ListingDetail = lazy(retryImport(() => import('./pages/ListingDetail')));
const CreateListing = lazy(retryImport(() => import('./pages/CreateListing')));
const EditListing = lazy(retryImport(() => import('./pages/EditListing')));
const MyListings = lazy(retryImport(() => import('./pages/MyListings')));
const Favourites = lazy(retryImport(() => import('./pages/Favourites')));
const Messages = lazy(retryImport(() => import('./pages/Messages')));
const Profile = lazy(retryImport(() => import('./pages/Profile')));
const SellerProfile = lazy(retryImport(() => import('./pages/SellerProfile')));
const NotFound = lazy(retryImport(() => import('./pages/NotFound')));

export default function App() {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="listing/:id" element={<ListingDetail />} />
        <Route path="u/:id" element={<SellerProfile />} />

        <Route element={<GuestRoute />}>
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route path="create" element={<CreateListing />} />
          <Route path="edit/:id" element={<EditListing />} />
          <Route path="my-listings" element={<MyListings />} />
          <Route path="favourites" element={<Favourites />} />
          <Route path="messages" element={<Messages />} />
          <Route path="messages/:chatId" element={<Messages />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
