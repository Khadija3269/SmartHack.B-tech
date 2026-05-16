import { currentUser } from "@/lib/auth";

export function SidebarProfile() {
  const user = currentUser();

  if (!user) return null;

  return (
    <div className="bg-[#a8c5e8] w-64 p-6 hidden md:flex flex-col min-h-full">
      <div className="flex flex-col items-center">
        <div className="w-24 h-24 bg-[#1f3a68] rounded-full flex items-center justify-center text-white text-3xl font-bold mb-4">
          {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-[#1f3a68] text-xl font-bold text-center mb-1">
          {user.fullName || user.name}
        </h2>
        <p className="text-[#1f3a68]/80 text-sm mb-6 capitalize">{user.role}</p>

        <div className="w-full bg-white rounded-lg p-4 shadow-sm text-sm">
          <div className="mb-3">
            <span className="block text-gray-500 text-xs uppercase font-bold">Email</span>
            <span className="text-gray-800 font-medium break-all">{user.email}</span>
          </div>
          <div className="mb-3">
            <span className="block text-gray-500 text-xs uppercase font-bold">Organization</span>
            <span className="text-gray-800 font-medium">{user.organization || "N/A"}</span>
          </div>
          <div>
            <span className="block text-gray-500 text-xs uppercase font-bold">Status</span>
            <span className="text-green-600 font-bold">{user.status || "Active"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
