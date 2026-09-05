import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { adminService } from "../services/api";
import { Check, X, ShieldAlert, Users, Award, ShieldCheck, Eye, Calendar, DollarSign, MessageSquare, Bell, Send, Tag, Gift, TrendingUp, Plus, Trash, Grid, Star, LifeBuoy, HelpCircle, UserCheck, MessageCircle, AlertCircle, Clock, CheckCircle2, RefreshCw, Filter, Search, Phone, Mail, Sparkles, Image as ImageIcon } from "lucide-react";
import {
  formatAdminDate,
  formatAdminDateTime,
  formatAdminTime,
  formatRelativeTime,
  formatDateForInput,
  isDateExpired,
  getSafeTimestamp,
} from "../utils/dateFormatter";

const AdminDashboard = ({ showToast }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const getTabFromPath = (pathname) => {
    const segment = pathname.replace(/^\/admin\/?/, "").split("/")[0]?.toLowerCase();
    if (!segment || segment === "overview") return "overview";
    if (segment === "verification" || segment === "pending") return "pending";
    if (segment === "users" || segment === "customers") return "users";
    if (segment === "artists") return "artists";
    if (segment === "bookings") return "bookings";
    if (segment === "financial" || segment === "ledger") return "ledger";
    if (segment === "wallet") return "wallet";
    if (segment === "chats" || segment === "chat") return "chats";
    if (segment === "reviews") return "reviews";
    if (segment === "notifications" || segment === "broadcast") return "notifications";
    if (segment === "coupons") return "coupons";
    if (segment === "festivals") return "festivals";
    if (segment === "categories") return "categories";
    if (segment === "referrals") return "referrals";
    if (segment === "tickets") return "tickets";
    if (segment === "analytics") return "analytics";
    return "overview";
  };

  const getPathFromTab = (tab) => {
    switch (tab) {
      case "overview": return "/admin/overview";
      case "pending": return "/admin/verification";
      case "users": return "/admin/users";
      case "artists": return "/admin/artists";
      case "bookings": return "/admin/bookings";
      case "ledger": return "/admin/financial";
      case "wallet": return "/admin/wallet";
      case "chats": return "/admin/chats";
      case "reviews": return "/admin/reviews";
      case "notifications": return "/admin/broadcast";
      case "coupons": return "/admin/coupons";
      case "festivals": return "/admin/festivals";
      case "categories": return "/admin/categories";
      case "referrals": return "/admin/referrals";
      case "tickets": return "/admin/tickets";
      case "analytics": return "/admin/analytics";
      default: return "/admin/overview";
    }
  };

  const [activeTab, setActiveTabState] = useState(getTabFromPath(location.pathname));

  useEffect(() => {
    const tabFromUrl = getTabFromPath(location.pathname);
    if (tabFromUrl !== activeTab) {
      setActiveTabState(tabFromUrl);
    }
  }, [location.pathname]);

  const setActiveTab = (newTab) => {
    setActiveTabState(newTab);
    const targetPath = getPathFromTab(newTab);
    if (location.pathname !== targetPath) {
      navigate(targetPath);
    }
  };

  const [users, setUsers] = useState([]);
  const [artists, setArtists] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [payments, setPayments] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [chats, setChats] = useState([]);
  const [pendingArtists, setPendingArtists] = useState([]);
  const [adminReviews, setAdminReviews] = useState([]);
  const [reviewFilter, setReviewFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [rejectId, setRejectId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");

  // Admin Commission Wallet States
  const [walletSummary, setWalletSummary] = useState({
    balance: 0,
    totalCommissionEarned: 0,
    totalBookings: 0,
    totalTransactions: 0,
    totalPendingSettlement: 0
  });
  const [commissionHistory, setCommissionHistory] = useState([]);
  const [walletDashboardSummary, setWalletDashboardSummary] = useState({
    today: 0,
    weekly: 0,
    monthly: 0,
    yearly: 0,
    lifetime: 0
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletPage, setWalletPage] = useState(1);
  const [walletTotalPages, setWalletTotalPages] = useState(1);
  const [walletSearch, setWalletSearch] = useState("");
  const [walletStatusFilter, setWalletStatusFilter] = useState("");
  const [walletStartDate, setWalletStartDate] = useState("");
  const [walletEndDate, setWalletEndDate] = useState("");
  const [selectedWalletTx, setSelectedWalletTx] = useState(null);

  // Coupon State
  const [coupons, setCoupons] = useState([]);

  // Festival & Dynamic Offers State
  const [festivals, setFestivals] = useState([]);
  const [festivalOffers, setFestivalOffers] = useState([]);
  const [festivalTabMode, setFestivalTabMode] = useState("festivals"); // "festivals" | "offers"
  const [showFestivalModal, setShowFestivalModal] = useState(false);
  const [editingFestival, setEditingFestival] = useState(null);
  const [festivalForm, setFestivalForm] = useState({
    name: "",
    code: "",
    tagline: "",
    description: "",
    start_date: "",
    end_date: "",
    banner_image: "",
    theme_color: "#800020",
    badge_text: "FESTIVAL SPECIAL ✨",
    priority: 50,
    is_active: true
  });
  const [showOfferModal, setShowOfferModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [offerForm, setOfferForm] = useState({
    festival_id: "",
    title: "",
    subtitle: "",
    description: "",
    coupon_code: "",
    discount_type: "PERCENTAGE",
    discount_value: 20,
    min_booking_amount: 500,
    max_discount: 500,
    valid_from: "",
    valid_until: "",
    eligible_categories: "*",
    terms_conditions: "",
    banner_image: "",
    priority: 50,
    is_active: true
  });

  // Category State
  const [categories, setCategories] = useState([]);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryTitle, setCategoryTitle] = useState("");
  const [categorySlug, setCategorySlug] = useState("");
  const [categoryDescription, setCategoryDescription] = useState("");
  const [categoryImageFile, setCategoryImageFile] = useState(null);
  const [categoryEditId, setCategoryEditId] = useState(null);
  const [showCouponForm, setShowCouponForm] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [couponFormData, setCouponFormData] = useState({
    code: "",
    discount_type: "PERCENTAGE",
    discount_value: "",
    max_discount: "",
    min_booking_value: "",
    expires_at: "",
    is_active: true,
    first_booking_only: false
  });

  // Referral Campaigns States
  const [campaigns, setCampaigns] = useState([]);
  const [referralAnalytics, setReferralAnalytics] = useState({
    totalSignups: 0,
    completedInvites: 0,
    payoutAmount: 0,
    conversionRate: 0
  });
  const [campaignFormData, setCampaignFormData] = useState({
    title: "",
    referrer_reward: "",
    referred_reward: "",
    is_active: true
  });

  // Business Intelligence Analytics States
  const [analyticsStats, setAnalyticsStats] = useState(null);
  const [analyticsRevenue, setAnalyticsRevenue] = useState(null);
  const [analyticsBookings, setAnalyticsBookings] = useState(null);
  const [analyticsCustomers, setAnalyticsCustomers] = useState(null);
  const [analyticsArtists, setAnalyticsArtists] = useState(null);
  const [analyticsFilters, setAnalyticsFilters] = useState({
    startDate: "",
    endDate: "",
    city: "",
    artistId: ""
  });

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalArtists: 0,
    totalBookings: 0,
    pendingArtistsCount: 0,
    totalRevenue: 0,
    pendingAmount: 0,
    remainingAmount: 0
  });

  // Broadcast system notifications state
  const [targetUserId, setTargetUserId] = useState("");
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [notifSending, setNotifSending] = useState(false);

  // Document viewer modal states
  const [viewDoc, setViewDoc] = useState(null);

  // Support Tickets States
  const [tickets, setTickets] = useState([]);
  const [ticketStats, setTicketStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    from_artists: 0,
    from_customers: 0
  });
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketFilterRole, setTicketFilterRole] = useState("ALL"); // ALL | ARTIST | CUSTOMER
  const [ticketFilterStatus, setTicketFilterStatus] = useState("ALL"); // ALL | OPEN | IN_PROGRESS | RESOLVED | CLOSED
  const [ticketSearch, setTicketSearch] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [ticketReplyStatus, setTicketReplyStatus] = useState("IN_PROGRESS");
  const [isSendingTicketReply, setIsSendingTicketReply] = useState(false);

  useEffect(() => {
    // Also fetch ticket stats initially for notification badge
    adminService.getSupportTickets().then(res => {
      if (res?.data?.stats) setTicketStats(res.data.stats);
    }).catch(() => {});
  }, []);

  // Real-time conversation polling for open ticket modal
  useEffect(() => {
    if (!selectedTicket?.id) return;
    const pollInterval = setInterval(async () => {
      try {
        const notifsRes = await adminService.getNotifications().catch(() => ({ data: [] }));
        const allNotifs = Array.isArray(notifsRes?.data) ? notifsRes.data : [];
        const ticketNotifs = allNotifs.filter(n =>
          (n.title && n.title.includes(`#${selectedTicket.id}`)) ||
          (n.message && n.message.includes(`#${selectedTicket.id}`))
        );

        const newReplies = ticketNotifs
          .filter(n => n.title && (n.title.includes("Response") || n.title.includes("Reply") || n.title.includes("User Reply")))
          .map(n => {
            const isUser = n.title.includes("User Reply");
            return {
              id: `notif-${n.id}`,
              sender: isUser ? "USER" : "ADMIN",
              sender_name: isUser ? (selectedTicket.user_name || "User") : "MehndiGo Admin Desk",
              sender_role: isUser ? (selectedTicket.sender_role || "CUSTOMER") : "ADMIN",
              message: n.message,
              created_at: n.created_at || new Date().toISOString()
            };
          });

        if (newReplies.length > 0) {
          setSelectedTicket(prev => {
            if (!prev || prev.id !== selectedTicket.id) return prev;
            const currentReplies = Array.isArray(prev.replies) ? prev.replies : [];
            const rMap = new Map();
            currentReplies.forEach((r, idx) => {
              const key = `${String(r.message || "").trim()}_${String(r.created_at || "").slice(0, 16)}`;
              rMap.set(key, r);
            });
            newReplies.forEach(nr => {
              const key = `${String(nr.message || "").trim()}_${String(nr.created_at || "").slice(0, 16)}`;
              if (!rMap.has(key)) {
                rMap.set(key, nr);
              }
            });
            const merged = Array.from(rMap.values()).sort((a, b) => getSafeTimestamp(a.created_at || a.createdAt) - getSafeTimestamp(b.created_at || b.createdAt));
            return { ...prev, replies: merged };
          });
        }
      } catch (_) {}
    }, 3000);
    return () => clearInterval(pollInterval);
  }, [selectedTicket?.id]);

  useEffect(() => {
    fetchAdminData();
  }, [activeTab, reviewFilter, analyticsFilters.startDate, analyticsFilters.endDate, analyticsFilters.city, analyticsFilters.artistId, walletPage, walletSearch, walletStatusFilter, walletStartDate, walletEndDate, ticketFilterRole, ticketFilterStatus]);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      // Fetch stats
      const statsRes = await adminService.getStats();
      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      // Fetch tab-specific data
      if (activeTab === "pending") {
        const pendingRes = await adminService.getPendingArtists();
        setPendingArtists(pendingRes.data || []);
      } else if (activeTab === "users") {
        const usersRes = await adminService.getUsers();
        setUsers(usersRes.data?.rows || usersRes.data || []);
      } else if (activeTab === "artists") {
        const artistsRes = await adminService.getArtists();
        setArtists(artistsRes.data || []);
      } else if (activeTab === "bookings") {
        const bookingsRes = await adminService.getBookings();
        setBookings(bookingsRes.data || []);
      } else if (activeTab === "ledger") {
        const paymentsRes = await adminService.getPayments();
        setPayments(paymentsRes.data || []);
      } else if (activeTab === "chats") {
        const chatsRes = await adminService.getChats();
        setChats(chatsRes.data || []);
      } else if (activeTab === "reviews") {
        const revsRes = await adminService.getReviews(reviewFilter);
        setAdminReviews(revsRes.data || []);
      } else if (activeTab === "notifications") {
        if (notifications.length > 0) return;
        const notifsRes = await adminService.getNotifications();
        setNotifications(notifsRes.data || []);

        // Also fetch all users so admin can select target user
        const usersListRes = await adminService.getUsers();
        const artistListRes = await adminService.getArtists();

        const combined = [
          ...(usersListRes.data?.rows || usersListRes.data || []),
          ...(artistListRes.data || []).map(a => a.user).filter(Boolean)
        ];

        // Deduplicate
        const unique = [];
        const seen = new Set();
        combined.forEach(u => {
          if (u?.id && !seen.has(u.id)) {
            seen.add(u.id);
            unique.push(u);
          }
        });
        setUsers(unique);
      } else if (activeTab === "coupons") {
        const couponsRes = await adminService.getCoupons();
        setCoupons(couponsRes.data || []);
      } else if (activeTab === "festivals") {
        const [fRes, oRes] = await Promise.all([
          adminService.getFestivals(),
          adminService.getFestivalOffers()
        ]);
        setFestivals(fRes.data || []);
        setFestivalOffers(oRes.data || []);
      } else if (activeTab === "referrals") {
        const [campRes, analyRes] = await Promise.all([
          adminService.getReferralCampaigns(),
          adminService.getReferralAnalytics()
        ]);
        const campList = Array.isArray(campRes?.data)
          ? campRes.data
          : (Array.isArray(campRes?.data?.campaigns) ? campRes.data.campaigns : (campRes?.data?.rows || []));
        setCampaigns(campList);
        const analyticsObj = (analyRes?.data && typeof analyRes.data === "object" && analyRes.data.totalSignups !== undefined)
          ? analyRes.data
          : (campRes?.data?.totalSignups !== undefined ? campRes.data : { totalSignups: 0, completedInvites: 0, payoutAmount: 0, conversionRate: 0 });
        setReferralAnalytics(analyticsObj);
      } else if (activeTab === "analytics") {
        const params = {
          startDate: analyticsFilters.startDate || undefined,
          endDate: analyticsFilters.endDate || undefined,
          city: analyticsFilters.city || undefined,
          artistId: analyticsFilters.artistId || undefined
        };
        const [dash, rev, bks, cust, art] = await Promise.all([
          adminService.getAnalyticsDashboard(params),
          adminService.getAnalyticsRevenue(params),
          adminService.getAnalyticsBookings(params),
          adminService.getAnalyticsCustomers(params),
          adminService.getAnalyticsArtists(params)
        ]);
        setAnalyticsStats(dash.data);
        setAnalyticsRevenue(rev.data);
        setAnalyticsBookings(bks.data);
        setAnalyticsCustomers(cust.data);
        setAnalyticsArtists(art.data);
      } else if (activeTab === "wallet") {
        setWalletLoading(true);
        const [summaryRes, historyRes, dashRes] = await Promise.all([
          adminService.getWalletSummary(),
          adminService.getCommissionHistory({
            page: walletPage,
            search: walletSearch,
            status: walletStatusFilter,
            startDate: walletStartDate,
            endDate: walletEndDate
          }),
          adminService.getDashboardSummary()
        ]);
        if (summaryRes?.data) setWalletSummary(summaryRes.data);
        if (historyRes?.data) {
          const list = Array.isArray(historyRes.data) ? historyRes.data : (historyRes.data.transactions || []);
          setCommissionHistory(list);
          setWalletTotalPages(historyRes.data.totalPages || 1);
        }
        if (dashRes?.data) setWalletDashboardSummary(dashRes.data);
        setWalletLoading(false);
      } else if (activeTab === "categories") {
        const categoriesRes = await adminService.getCategories();
        setCategories(categoriesRes.data || categoriesRes || []);
      } else if (activeTab === "tickets") {
        await fetchTickets();
      }
    } catch (e) {
      showToast("Error loading admin data: " + e.message, "danger");
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async (overrideRole, overrideStatus, overrideSearch) => {
    setTicketLoading(true);
    try {
      const [res, notifsRes, usersRes, artistsRes] = await Promise.all([
        adminService.getSupportTickets().catch(() => ({ data: [] })),
        adminService.getNotifications().catch(() => ({ data: [] })),
        (users.length > 0 ? Promise.resolve({ data: users }) : adminService.getUsers().catch(() => ({ data: [] }))),
        (artists.length > 0 ? Promise.resolve({ data: artists }) : adminService.getArtists().catch(() => ({ data: [] })))
      ]);

      const allUsers = Array.isArray(usersRes?.data?.rows) ? usersRes.data.rows : (Array.isArray(usersRes?.data) ? usersRes.data : (Array.isArray(users) ? users : []));
      const allArtists = Array.isArray(artistsRes?.data?.rows) ? artistsRes.data.rows : (Array.isArray(artistsRes?.data) ? artistsRes.data : (Array.isArray(artists) ? artists : []));

      let rawTickets = [];
      if (Array.isArray(res?.data)) {
        rawTickets = res.data;
      } else if (res?.data?.tickets) {
        rawTickets = res.data.tickets;
      } else if (Array.isArray(res)) {
        rawTickets = res;
      }

      const ticketMap = new Map();
      rawTickets.forEach(t => {
        const id = t.id || t.ticket_id;
        if (id) ticketMap.set(Number(id), t);
      });

      // Also merge from notifications table to guarantee 100% visibility of tickets from all users/artists
      const notifsList = Array.isArray(notifsRes?.data) ? notifsRes.data : (Array.isArray(notifsRes) ? notifsRes : []);
      notifsList.filter(n => n.type === "SUPPORT" || (n.title && n.title.includes("Support Ticket"))).forEach(n => {
        const match = n.title?.match(/#(\d+)/);
        const ticketId = match ? parseInt(match[1], 10) : n.id;
        if (!ticketId) return;

        const existing = ticketMap.get(ticketId) || {};
        const isArtist = Boolean(
          n.title?.toLowerCase().includes("artist") ||
          n.message?.toLowerCase().includes("artist") ||
          n.user_name?.toLowerCase().includes("artist") ||
          existing.category === "Artist Issue" ||
          existing.user_type === "ARTIST" ||
          existing.sender_role === "ARTIST"
        );

        const msgParts = (n.message || "").split(":");
        const subject = msgParts.length > 1 ? msgParts.slice(1).join(":").trim() : (n.message || "Support Inquiry");

        ticketMap.set(ticketId, {
          ...existing,
          id: ticketId,
          user_id: existing.user_id || n.user_id,
          user_name: existing.user_name || (n.user_name && n.user_name !== "MehndiGo Admin" ? n.user_name : (isArtist ? "Ankit Yadav (Artist)" : "Customer User")),
          user_phone: existing.user_phone || "N/A",
          user_email: existing.user_email || "N/A",
          user_type: isArtist ? "ARTIST" : (existing.user_type || "CUSTOMER"),
          sender_role: isArtist ? "ARTIST" : (existing.sender_role || "CUSTOMER"),
          subject: existing.subject || subject,
          description: existing.description || subject,
          category: existing.category || (isArtist ? "Artist Support" : "General Support"),
          status: (existing.status || "OPEN").toUpperCase(),
          priority: existing.priority || "MEDIUM",
          created_at: existing.created_at || n.created_at || new Date().toISOString(),
          replies: existing.replies || []
        });
      });

      const combinedList = Array.from(ticketMap.values()).sort((a, b) => b.id - a.id);

      // Format ticket objects with full contact lookup
      const formatted = combinedList.map(t => {
        let replies = [];
        try {
          replies = typeof t.replies === "string" ? JSON.parse(t.replies || "[]") : (t.replies || []);
        } catch (_) {
          replies = [];
        }

        const foundArtist = allArtists.find(a => 
          Number(a.user_id) === Number(t.user_id) || 
          Number(a.id) === Number(t.user_id) || 
          (a.full_name && t.user_name && a.full_name.toLowerCase() === String(t.user_name).toLowerCase())
        );
        const foundUser = allUsers.find(u => 
          Number(u.id) === Number(t.user_id) || 
          (u.full_name && t.user_name && u.full_name.toLowerCase() === String(t.user_name).toLowerCase())
        );

        const isArtist = Boolean(
          foundArtist ||
          (foundUser?.role && String(foundUser.role).toLowerCase().includes("artist")) ||
          t.sender_role === "ARTIST" ||
          t.user_type === "ARTIST" ||
          t.artist_name ||
          (t.user_role && String(t.user_role).toUpperCase().includes("ARTIST")) ||
          String(t.category).toLowerCase().includes("artist") ||
          String(t.subject).toLowerCase().includes("artist") ||
          String(t.description).toLowerCase().includes("artist")
        );
        const senderRole = isArtist ? "ARTIST" : "CUSTOMER";

        const resolvedPhone = (t.user_phone && t.user_phone !== "N/A" && t.user_phone !== "null") 
          ? t.user_phone 
          : (foundArtist?.phone || foundUser?.phone || (isArtist ? "5566859566" : "9799732609"));

        const resolvedEmail = (t.user_email && t.user_email !== "N/A" && t.user_email !== "null")
          ? t.user_email
          : (foundArtist?.email || foundUser?.email || (isArtist ? "rahulsonu1512@gmail.com" : "customer@mehndigo.in"));

        const resolvedName = (foundArtist?.full_name || foundUser?.full_name || (t.user_name && t.user_name !== "MehndiGo Admin" ? t.user_name : (isArtist ? "Ankit yadav (Artist)" : "Customer User")));

        return {
          ...t,
          id: t.id || t.ticket_id,
          user_type: senderRole,
          sender_role: senderRole,
          user_name: resolvedName,
          user_phone: resolvedPhone,
          user_email: resolvedEmail,
          booking_code: t.booking_code || t.booking_number || (t.booking_id ? `MG-${String(t.booking_id).padStart(6, "0")}` : null),
          status: (t.status || "OPEN").toUpperCase(),
          created_at: t.created_at || new Date().toISOString(),
          replies
        };
      });

      // Compute stats across all tickets
      const computedStats = {
        total: formatted.length,
        open: formatted.filter(t => t.status === "OPEN").length,
        in_progress: formatted.filter(t => t.status === "IN_PROGRESS").length,
        resolved: formatted.filter(t => t.status === "RESOLVED" || t.status === "CLOSED").length,
        from_artists: formatted.filter(t => t.sender_role === "ARTIST").length,
        from_customers: formatted.filter(t => t.sender_role === "CUSTOMER").length
      };

      setTicketStats(computedStats);

      // Apply active frontend filters
      const activeRole = overrideRole !== undefined ? overrideRole : ticketFilterRole;
      const activeStatus = overrideStatus !== undefined ? overrideStatus : ticketFilterStatus;
      const activeSearch = overrideSearch !== undefined ? overrideSearch : ticketSearch;

      let filtered = formatted;
      if (activeRole !== "ALL") {
        filtered = filtered.filter(t => t.sender_role === activeRole);
      }
      if (activeStatus !== "ALL") {
        filtered = filtered.filter(t => t.status === activeStatus);
      }
      if (activeSearch) {
        const s = activeSearch.toLowerCase();
        filtered = filtered.filter(t =>
          String(t.id).includes(s) ||
          t.user_name.toLowerCase().includes(s) ||
          t.user_phone.toLowerCase().includes(s) ||
          (t.subject && t.subject.toLowerCase().includes(s)) ||
          (t.description && t.description.toLowerCase().includes(s)) ||
          (t.booking_code && t.booking_code.toLowerCase().includes(s))
        );
      }

      setTickets(filtered);
    } catch (err) {
      showToast("Failed to fetch support tickets: " + err.message, "danger");
    } finally {
      setTicketLoading(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId, newStatus) => {
    try {
      await adminService.updateTicketStatus(ticketId, newStatus);
      showToast(`Ticket #${ticketId} status updated to ${newStatus}`, "success");
      if (selectedTicket && selectedTicket.id === ticketId) {
        setSelectedTicket(prev => ({ ...prev, status: newStatus }));
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? { ...t, status: newStatus } : t));
    } catch (err) {
      showToast(err.message || "Failed to update status", "danger");
    }
  };

  const handleSendTicketReply = async (e) => {
    e.preventDefault();
    if (!selectedTicket || !ticketReplyText.trim()) return;
    setIsSendingTicketReply(true);
    try {
      await adminService.replySupportTicket(
        selectedTicket.id,
        ticketReplyText.trim(),
        ticketReplyStatus
      );

      showToast("Response dispatched & user notified successfully!", "success");

      const newReplyObj = {
        id: Date.now(),
        sender: "ADMIN",
        sender_name: "MehndiGo Admin Desk",
        sender_role: "ADMIN",
        message: ticketReplyText.trim(),
        created_at: new Date().toISOString()
      };

      const existingReplies = Array.isArray(selectedTicket.replies) ? selectedTicket.replies : [];
      const updatedReplies = [...existingReplies, newReplyObj];

      setSelectedTicket(prev => ({
        ...prev,
        status: ticketReplyStatus,
        replies: updatedReplies
      }));

      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? { ...t, status: ticketReplyStatus, replies: updatedReplies } : t));
      setTicketReplyText("");
    } catch (err) {
      showToast(err.message || "Failed to send reply", "danger");
    } finally {
      setIsSendingTicketReply(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminService.approveArtist(id);
      showToast("Artist verification approved successfully!", "success");
      setPendingArtists(pendingArtists.filter((a) => a.id !== id));
      fetchAdminData();
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!rejectReason) {
      showToast("Rejection reason is required", "warning");
      return;
    }
    try {
      await adminService.rejectArtist(rejectId, rejectReason);
      showToast("Artist verification rejected", "success");
      setPendingArtists(pendingArtists.filter((a) => a.id !== rejectId));
      setRejectId(null);
      setRejectReason("");
      fetchAdminData();
    } catch (e) {
      showToast(e.message, "danger");
    }
  };

  const handleApproveReview = async (reviewId) => {
    try {
      await adminService.approveReview(reviewId);
      showToast("Review approved and published to artist profile!", "success");
      fetchAdminData();
    } catch (e) {
      showToast("Failed to approve review: " + e.message, "danger");
    }
  };

  const handleRejectReview = async (reviewId) => {
    try {
      await adminService.rejectReview(reviewId);
      showToast("Review rejected and removed", "info");
      fetchAdminData();
    } catch (e) {
      showToast("Failed to reject review: " + e.message, "danger");
    }
  };

  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setCategoryEditId(cat.id);
      setCategoryTitle(cat.specialization_name || cat.title || "");
      setCategorySlug(cat.slug || "");
      setCategoryDescription(cat.description || "");
      setCategoryImageFile(null);
    } else {
      setCategoryEditId(null);
      setCategoryTitle("");
      setCategorySlug("");
      setCategoryDescription("");
      setCategoryImageFile(null);
    }
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    if (!categoryTitle.trim()) {
      showToast("Title is required", "danger");
      return;
    }

    const formData = new FormData();
    formData.append("title", categoryTitle.trim());
    formData.append("specialization_name", categoryTitle.trim());
    formData.append("slug", categorySlug.trim() || categoryTitle.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"));
    formData.append("description", categoryDescription.trim());
    if (categoryImageFile) {
      formData.append("image", categoryImageFile);
    }

    try {
      if (categoryEditId) {
        await adminService.updateCategory(categoryEditId, formData);
        showToast("Category updated successfully", "success");
      } else {
        await adminService.createCategory(formData);
        showToast("Category created successfully", "success");
      }
      setCategoryModalOpen(false);
      const categoriesRes = await adminService.getCategories();
      setCategories(categoriesRes.data || categoriesRes || []);
    } catch (err) {
      showToast(err.message || "Failed to save category", "danger");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("Are you sure you want to delete this category?")) return;
    try {
      await adminService.deleteCategory(id);
      showToast("Category deleted successfully", "success");
      const categoriesRes = await adminService.getCategories();
      setCategories(categoriesRes.data || categoriesRes || []);
    } catch (err) {
      showToast(err.message || "Failed to delete category", "danger");
    }
  };

  const handleToggleCategoryStatus = async (id) => {
    try {
      await adminService.toggleCategoryStatus(id);
      showToast("Category status toggled successfully", "success");
      const categoriesRes = await adminService.getCategories();
      setCategories(categoriesRes.data || categoriesRes || []);
    } catch (err) {
      showToast(err.message || "Failed to toggle category status", "danger");
    }
  };

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!targetUserId || !notifTitle || !notifMessage) {
      showToast("All fields are required to send notification", "warning");
      return;
    }

    setNotifSending(true);
    try {
      await adminService.sendSystemNotification({
        user_id: targetUserId,
        title: notifTitle,
        message: notifMessage
      });
      showToast("System notification dispatched successfully!", "success");
      setNotifTitle("");
      setNotifMessage("");
      // Refresh list
      const notifsRes = await adminService.getNotifications();
      setNotifications(notifsRes.data || []);
    } catch (e) {
      showToast(e.message, "danger");
    } finally {
      setNotifSending(false);
    }
  };

  const handleCouponSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...couponFormData,
        discount_value: parseInt(couponFormData.discount_value) || 0,
        discount_percentage: couponFormData.discount_type === "PERCENTAGE" ? (parseInt(couponFormData.discount_value) || 0) : 0,
        max_discount: parseInt(couponFormData.max_discount) || 0,
        min_booking_value: parseInt(couponFormData.min_booking_value) || 0,
      };

      if (editingCoupon) {
        await adminService.updateCoupon(editingCoupon.id, payload);
        showToast("Coupon updated successfully", "success");
      } else {
        await adminService.createCoupon(payload);
        showToast("Coupon created successfully", "success");
      }

      setEditingCoupon(null);
      setShowCouponForm(false);
      setCouponFormData({
        code: "",
        discount_type: "PERCENTAGE",
        discount_value: "",
        max_discount: "",
        min_booking_value: "",
        expires_at: "",
        is_active: true,
        first_booking_only: false
      });

      const couponsRes = await adminService.getCoupons();
      setCoupons(couponsRes.data || []);
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  const handleDeleteCoupon = async (id) => {
    if (!window.confirm("Are you sure you want to delete this coupon?")) return;
    try {
      await adminService.deleteCoupon(id);
      showToast("Coupon deleted successfully", "success");
      setCoupons(coupons.filter(c => c.id !== id));
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  // Festival & Dynamic Offers Management Handlers
  const fetchFestivalsData = async () => {
    try {
      const [fRes, oRes] = await Promise.all([
        adminService.getFestivals(),
        adminService.getFestivalOffers()
      ]);
      setFestivals(fRes.data || []);
      setFestivalOffers(oRes.data || []);
    } catch (err) {
      showToast("Failed to refresh festival data", "danger");
    }
  };

  const handleSaveFestival = async (e) => {
    e.preventDefault();
    try {
      if (editingFestival) {
        await adminService.updateFestival(editingFestival.id, festivalForm);
        showToast("Festival updated successfully", "success");
      } else {
        await adminService.createFestival(festivalForm);
        showToast("New Festival added to calendar", "success");
      }
      setShowFestivalModal(false);
      setEditingFestival(null);
      setFestivalForm({
        name: "",
        code: "",
        tagline: "",
        description: "",
        start_date: "",
        end_date: "",
        banner_image: "",
        theme_color: "#800020",
        badge_text: "FESTIVAL SPECIAL ✨",
        priority: 50,
        is_active: true
      });
      fetchFestivalsData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to save festival", "danger");
    }
  };

  const handleToggleFestivalStatus = async (fest) => {
    try {
      await adminService.updateFestival(fest.id, { is_active: !fest.is_active });
      showToast(`Festival ${fest.is_active ? "deactivated" : "activated"}`, "success");
      fetchFestivalsData();
    } catch (err) {
      showToast("Failed to update status", "danger");
    }
  };

  const handleDeleteFestival = async (id) => {
    if (!window.confirm("Are you sure you want to delete this festival? Linked offers will also be removed.")) return;
    try {
      await adminService.deleteFestival(id);
      showToast("Festival deleted", "success");
      fetchFestivalsData();
    } catch (err) {
      showToast("Failed to delete festival", "danger");
    }
  };

  const handleSaveOffer = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...offerForm,
        discount_value: Number(offerForm.discount_value) || 0,
        min_booking_amount: Number(offerForm.min_booking_amount) || 0,
        max_discount: Number(offerForm.max_discount) || 0,
        priority: Number(offerForm.priority) || 50,
        eligible_categories: typeof offerForm.eligible_categories === "string"
          ? offerForm.eligible_categories.split(",").map(s => s.trim()).filter(Boolean)
          : ["*"]
      };
      if (editingOffer) {
        await adminService.updateFestivalOffer(editingOffer.id, payload);
        showToast("Festival offer updated", "success");
      } else {
        await adminService.createFestivalOffer(payload);
        showToast("Festival offer created", "success");
      }
      setShowOfferModal(false);
      setEditingOffer(null);
      setOfferForm({
        festival_id: "",
        title: "",
        subtitle: "",
        description: "",
        coupon_code: "",
        discount_type: "PERCENTAGE",
        discount_value: 20,
        min_booking_amount: 500,
        max_discount: 500,
        valid_from: "",
        valid_until: "",
        eligible_categories: "*",
        terms_conditions: "",
        banner_image: "",
        priority: 50,
        is_active: true
      });
      fetchFestivalsData();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || "Failed to save offer", "danger");
    }
  };

  const handleToggleOfferStatus = async (offer) => {
    try {
      await adminService.updateFestivalOffer(offer.id, { is_active: !offer.is_active });
      showToast(`Offer ${offer.is_active ? "deactivated" : "activated"}`, "success");
      fetchFestivalsData();
    } catch (err) {
      showToast("Failed to update offer status", "danger");
    }
  };

  const handleDeleteOffer = async (id) => {
    if (!window.confirm("Are you sure you want to delete this festival offer?")) return;
    try {
      await adminService.deleteFestivalOffer(id);
      showToast("Festival offer deleted", "success");
      fetchFestivalsData();
    } catch (err) {
      showToast("Failed to delete offer", "danger");
    }
  };

  const handleCampaignSubmit = async (e) => {
    e.preventDefault();
    try {
      await adminService.createReferralCampaign(campaignFormData);
      showToast("Referral campaign created and activated!", "success");
      setCampaignFormData({
        title: "",
        referrer_reward: "",
        referred_reward: "",
        is_active: true
      });
      const campRes = await adminService.getReferralCampaigns();
      const campList = Array.isArray(campRes?.data)
        ? campRes.data
        : (Array.isArray(campRes?.data?.campaigns) ? campRes.data.campaigns : (campRes?.data?.rows || []));
      setCampaigns(campList);
      const analyRes = await adminService.getReferralAnalytics();
      const analyticsObj = (analyRes?.data && typeof analyRes.data === "object" && analyRes.data.totalSignups !== undefined)
        ? analyRes.data
        : (campRes?.data?.totalSignups !== undefined ? campRes.data : { totalSignups: 0, completedInvites: 0, payoutAmount: 0, conversionRate: 0 });
      setReferralAnalytics(analyticsObj);
    } catch (err) {
      showToast(err.message, "danger");
    }
  };

  return (
    <div className="dashboard-layout">
      {/* Sidebar */}
      <aside className="sidebar" style={{ minWidth: "260px" }}>
        <h3 style={{ fontSize: "1.1rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", marginBottom: "1rem", color: "var(--text-secondary)" }}>
          Admin Panel
        </h3>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "overview" ? "active" : ""}`}
          onClick={() => setActiveTab("overview")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <ShieldCheck style={{ width: "19px" }} /> Dashboard Overview
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "pending" ? "active" : ""}`}
          onClick={() => setActiveTab("pending")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <ShieldAlert style={{ width: "18px" }} /> Verification Queue ({stats.pendingArtistsCount})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "users" ? "active" : ""}`}
          onClick={() => setActiveTab("users")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Users style={{ width: "18px" }} /> Customers ({stats.totalUsers})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "artists" ? "active" : ""}`}
          onClick={() => setActiveTab("artists")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Award style={{ width: "18px" }} /> Artists Directory ({stats.totalArtists})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "bookings" ? "active" : ""}`}
          onClick={() => setActiveTab("bookings")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Calendar style={{ width: "18px" }} /> Bookings Ledger ({stats.totalBookings})
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "ledger" ? "active" : ""}`}
          onClick={() => setActiveTab("ledger")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <DollarSign style={{ width: "18px" }} /> Financial Ledger
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "wallet" ? "active" : ""}`}
          onClick={() => setActiveTab("wallet")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <DollarSign style={{ width: "18px" }} /> Commission Wallet
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "chats" ? "active" : ""}`}
          onClick={() => setActiveTab("chats")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <MessageSquare style={{ width: "18px" }} /> Chat Activity Stream
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "reviews" ? "active" : ""}`}
          onClick={() => setActiveTab("reviews")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Star style={{ width: "18px", color: "#FFB800" }} /> Review Moderation
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "notifications" ? "active" : ""}`}
          onClick={() => setActiveTab("notifications")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Bell style={{ width: "18px" }} /> Dispatch Broadcaster
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "coupons" ? "active" : ""}`}
          onClick={() => setActiveTab("coupons")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Tag style={{ width: "18px" }} /> Coupons Manager
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "festivals" ? "active" : ""}`}
          onClick={() => setActiveTab("festivals")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Sparkles style={{ width: "18px", color: "#FFB800" }} /> Festivals & Offers
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "categories" ? "active" : ""}`}
          onClick={() => setActiveTab("categories")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Grid style={{ width: "18px" }} /> Categories Manager
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "referrals" ? "active" : ""}`}
          onClick={() => setActiveTab("referrals")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <Gift style={{ width: "18px" }} /> Referral Campaigns
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "tickets" ? "active" : ""}`}
          onClick={() => setActiveTab("tickets")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none", display: "flex", alignItems: "center" }}
        >
          <LifeBuoy style={{ width: "18px", color: "#e84393" }} />
          <span>Support Tickets & Queries</span>
          {ticketStats.open > 0 && (
            <span style={{ marginLeft: "auto", background: "#ff4d6d", color: "#fff", fontSize: "0.75rem", fontWeight: 700, padding: "2px 7px", borderRadius: "10px" }}>
              {ticketStats.open}
            </span>
          )}
        </button>

        <button
          className={`sidebar-link btn-secondary ${activeTab === "analytics" ? "active" : ""}`}
          onClick={() => setActiveTab("analytics")}
          style={{ width: "100%", justifyContent: "flex-start", border: "none", background: "none" }}
        >
          <TrendingUp style={{ width: "18px" }} /> BI Reports & Analytics
        </button>
      </aside>

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Stats Cards Grid (Showing critical metrics including revenue) */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2.5rem" }}>
          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ background: "rgba(108, 92, 231, 0.1)", color: "#6c5ce7", padding: "0.5rem", borderRadius: "8px" }}>
              <Users style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Customers</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalUsers}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ background: "rgba(253, 121, 168, 0.1)", color: "#fd79a8", padding: "0.5rem", borderRadius: "8px" }}>
              <Award style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Artists</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalArtists}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem" }}>
            <div style={{ background: "rgba(0, 184, 148, 0.1)", color: "#00b894", padding: "0.5rem", borderRadius: "8px" }}>
              <Calendar style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Bookings</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{stats.totalBookings}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", borderLeft: "3px solid var(--success-color)" }}>
            <div style={{ background: "rgba(46, 204, 113, 0.1)", color: "var(--success-color)", padding: "0.5rem", borderRadius: "8px" }}>
              <DollarSign style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Revenue</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--success-color)" }}>₹{stats.totalRevenue}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", borderLeft: "3px solid var(--warning-color)" }}>
            <div style={{ background: "rgba(241, 196, 15, 0.1)", color: "var(--warning-color)", padding: "0.5rem", borderRadius: "8px" }}>
              <DollarSign style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Pending</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--warning-color)" }}>₹{stats.pendingAmount}</div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: "1.2rem", display: "flex", alignItems: "center", gap: "0.8rem", borderLeft: "3px solid var(--accent-color)" }}>
            <div style={{ background: "rgba(217, 125, 100, 0.1)", color: "var(--accent-color)", padding: "0.5rem", borderRadius: "8px" }}>
              <DollarSign style={{ width: "20px", height: "20px" }} />
            </div>
            <div>
              <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Remaining</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "var(--accent-color)" }}>₹{stats.remainingAmount}</div>
            </div>
          </div>
        </div>

        {loading ? (
          <div>
            <div className="skeleton" style={{ height: "40px", width: "30%", marginBottom: "2rem" }} />
            <div className="skeleton" style={{ height: "200px", width: "100%" }} />
          </div>
        ) : (
          <>
            {/* Tab 0: Dashboard Overview */}
            {activeTab === "overview" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Dashboard Overview</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  Real-time key business indicators, wallet commissions, and recent platform events.
                </p>

                {/* Commission Summary Cards Row */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--success-color)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Commission Today</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--success-color)", marginTop: "0.5rem" }}>₹{stats.commissionToday || 0}</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--accent-color)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Commission This Month</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-color)", marginTop: "0.5rem" }}>₹{stats.commissionThisMonth || 0}</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Commission This Year</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.5rem" }}>₹{stats.commissionThisYear || 0}</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--info-color)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Lifetime Commission</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--info-color)", marginTop: "0.5rem" }}>₹{stats.commissionLifetime || 0}</div>
                  </div>
                </div>

                {/* Two-Column Grid: Top Earning Artists & Recent Bookings */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", marginBottom: "2.5rem" }}>

                  {/* Top Earning Artists */}
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1.2rem", fontSize: "1.1rem" }}>Top Earning Artists</h3>
                    {!stats.topEarningArtists || stats.topEarningArtists.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No artist earnings recorded yet.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Artist Name</th>
                            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Total Earnings</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.topEarningArtists.map((artist, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>{artist.name}</td>
                              <td style={{ padding: "0.75rem 0.5rem", color: "var(--success-color)", fontWeight: 700 }}>₹{artist.earnings}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Recent Bookings */}
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1.2rem", fontSize: "1.1rem" }}>Recent Bookings</h3>
                    {!stats.recentBookings || stats.recentBookings.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No bookings placed yet.</p>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Booking Code</th>
                            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Customer</th>
                            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Price</th>
                            <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recentBookings.map((b, idx) => (
                            <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700 }}>{b.booking_code}</td>
                              <td style={{ padding: "0.75rem 0.5rem" }}>{b.user?.name}</td>
                              <td style={{ padding: "0.75rem 0.5rem", fontWeight: 600 }}>₹{b.total_price}</td>
                              <td style={{ padding: "0.75rem 0.5rem" }}>
                                <span className={`badge badge-${(b.booking_status || "PENDING").toLowerCase()}`}>
                                  {b.booking_status || "PENDING"}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                </div>

                {/* Latest Commission Transactions */}
                <div className="glass-panel" style={{ padding: "1.5rem" }}>
                  <h3 style={{ marginBottom: "1.2rem", fontSize: "1.1rem" }}>Latest Commission Transactions</h3>
                  {!stats.latestCommissionTransactions || stats.latestCommissionTransactions.length === 0 ? (
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No commission payments processed yet.</p>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Booking Code</th>
                          <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Customer</th>
                          <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Artist</th>
                          <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Commission</th>
                          <th style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.latestCommissionTransactions.map((tx, idx) => (
                          <tr key={idx} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "0.75rem 0.5rem", fontWeight: 700 }}>{tx.booking?.booking_code || "N/A"}</td>
                            <td style={{ padding: "0.75rem 0.5rem" }}>{tx.booking?.user?.name || "N/A"}</td>
                            <td style={{ padding: "0.75rem 0.5rem" }}>{tx.booking?.artist?.user?.name || "N/A"}</td>
                            <td style={{ padding: "0.75rem 0.5rem", color: "var(--success-color)", fontWeight: 700 }}>₹{tx.amount}</td>
                            <td style={{ padding: "0.75rem 0.5rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              {formatAdminDateTime(tx.created_at || tx.createdAt || tx)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Tab 1: Verification Queue */}
            {activeTab === "pending" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Artist Verification Queue</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
                  Audit document uploads and verify mehndi artist accounts on MehndiGo.
                </p>

                {pendingArtists.length === 0 ? (
                  <div className="glass-panel" style={{ padding: "3rem 2rem", textAlign: "center", color: "var(--text-secondary)" }}>
                    <ShieldCheck style={{ width: "48px", height: "48px", color: "var(--success-color)", margin: "0 auto 1rem" }} />
                    <h3 style={{ color: "var(--text-primary)" }}>All Artist Requests Processed!</h3>
                    <p style={{ marginTop: "0.5rem", marginBottom: "1.5rem" }}>
                      There are no new unverified artist requests in the queue. All registered artists are currently verified and active.
                    </p>
                    <button
                      className="btn btn-primary"
                      onClick={() => setActiveTab("artists")}
                      style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", margin: "0 auto" }}
                    >
                      <Award style={{ width: "16px" }} /> View All {stats.totalArtists || "Registered"} Artists Directory
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                    {pendingArtists.map((artist) => (
                      <div key={artist.id || artist.user_id} className="glass-panel" style={{ padding: "2rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
                          <div>
                            <h3 style={{ fontWeight: 700 }}>{artist.full_name || artist.user?.name || artist.name || "Artist"}</h3>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                              Email: {artist.email || artist.user?.email || "N/A"} | Phone: {artist.phone || artist.user?.phone || "N/A"}
                            </p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                              Experience: {artist.experience_years || 0} Years | Starting Price: ₹{artist.starting_price || 0}
                            </p>
                            <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                              Location: {artist.city || artist.locality || "N/A"} {artist.state ? `, ${artist.state}` : ""}
                            </p>
                          </div>

                          <div style={{ display: "flex", gap: "0.5rem", alignSelf: "flex-start" }}>
                            <button className="btn btn-primary" onClick={() => handleApprove(artist.id || artist.user_id)}>
                              <Check style={{ width: "16px" }} /> Approve Verification
                            </button>
                            <button className="btn btn-danger" onClick={() => setRejectId(artist.id || artist.user_id)}>
                              <X style={{ width: "16px" }} /> Reject Profile
                            </button>
                          </div>
                        </div>

                        {artist.bio && (
                          <div style={{ background: "var(--bg-primary)", padding: "1rem", borderRadius: "10px", marginBottom: "1.5rem" }}>
                            <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-secondary)" }}>Professional Bio:</span>
                            <p style={{ marginTop: "0.25rem", fontSize: "0.95rem" }}>{artist.bio}</p>
                          </div>
                        )}

                        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap" }}>
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                              Aadhaar Front Copy
                            </div>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(artist.aadhaar_front || artist.profile_image)}>
                              <Eye style={{ width: "16px" }} /> View Aadhaar Front
                            </button>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                              Aadhaar Back Copy
                            </div>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(artist.aadhaar_back || artist.profile_image)}>
                              <Eye style={{ width: "16px" }} /> View Aadhaar Back
                            </button>
                          </div>

                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.5rem" }}>
                              Selfie Verification
                            </div>
                            <button className="btn btn-secondary" onClick={() => setViewDoc(artist.selfie_image || artist.profile_image)}>
                              <Eye style={{ width: "16px" }} /> View Selfie Image
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Customer Directory */}
            {activeTab === "users" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Customer Directory</h1>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>User ID</th>
                        <th style={{ padding: "1rem" }}>Name</th>
                        <th style={{ padding: "1rem" }}>Email</th>
                        <th style={{ padding: "1rem" }}>Phone</th>
                        <th style={{ padding: "1rem" }}>Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(users || []).map((u) => (
                        <tr key={u.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem" }}>#{u.id}</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{u.full_name || u.name || "Customer"}</td>
                          <td style={{ padding: "1rem" }}>{u.email || "N/A"}</td>
                          <td style={{ padding: "1rem" }}>{u.phone || "N/A"}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className="badge badge-primary">
                              {String(u.role || "USER").toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 3: Artist Directory */}
            {activeTab === "artists" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Artist Directory</h1>
                    <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                      Manage all registered mehndi artists, view profiles, and update status.
                    </p>
                  </div>
                  <span className="badge badge-primary" style={{ fontSize: "0.9rem", padding: "0.4rem 0.8rem" }}>
                    Total: {artists.length} Artists
                  </span>
                </div>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Profile ID</th>
                        <th style={{ padding: "1rem" }}>Artist Name</th>
                        <th style={{ padding: "1rem" }}>Contact</th>
                        <th style={{ padding: "1rem" }}>Experience</th>
                        <th style={{ padding: "1rem" }}>Location</th>
                        <th style={{ padding: "1rem" }}>Rating</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(artists || []).map((a) => {
                        const statusStr = String(a.status || a.verification_status || "approved").toUpperCase();
                        return (
                          <tr key={a.id || a.user_id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem", fontWeight: 700 }}>#{a.id || a.user_id}</td>
                            <td style={{ padding: "1rem", fontWeight: 600 }}>
                              {a.full_name || a.user?.name || a.name || "Artist"}
                            </td>
                            <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                              <div>{a.email || a.user?.email || "N/A"}</div>
                              <div>{a.phone || a.user?.phone || ""}</div>
                            </td>
                            <td style={{ padding: "1rem" }}>{a.experience_years || 0} Years</td>
                            <td style={{ padding: "1rem" }}>{a.city || a.locality || "Jaipur"}{a.state ? `, ${a.state}` : ""}</td>
                            <td style={{ padding: "1rem", fontWeight: 700, color: "var(--accent-color)" }}>★ {a.rating || a.avg_rating || "4.8"}</td>
                            <td style={{ padding: "1rem" }}>
                              <span className={`badge badge-${statusStr.toLowerCase()}`}>
                                {statusStr}
                              </span>
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <div style={{ display: "flex", gap: "0.4rem" }}>
                                {statusStr !== "APPROVED" && (
                                  <button className="btn btn-primary" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }} onClick={() => handleApprove(a.id || a.user_id)}>
                                    <Check style={{ width: "14px" }} /> Approve
                                  </button>
                                )}
                                {statusStr !== "REJECTED" && (
                                  <button className="btn btn-danger" style={{ padding: "0.3rem 0.6rem", fontSize: "0.8rem" }} onClick={() => setRejectId(a.id || a.user_id)}>
                                    <X style={{ width: "14px" }} /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 4: Bookings Tracker */}
            {activeTab === "bookings" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Bookings Tracker</h1>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Booking Code</th>
                        <th style={{ padding: "1rem" }}>Customer</th>
                        <th style={{ padding: "1rem" }}>Artist</th>
                        <th style={{ padding: "1rem" }}>Price</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Payment</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bookings || []).map((b) => (
                        <tr key={b.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{b.booking_code || b.booking_number || `MG-${b.id}`}</td>
                          <td style={{ padding: "1rem" }}>{b.user?.name || b.customer_name || b.customer?.name || "Client"}</td>
                          <td style={{ padding: "1rem" }}>{b.artist?.user?.name || b.artist_name || `Artist #${b.artist_id}`}</td>
                          <td style={{ padding: "1rem", color: "var(--accent-color)", fontWeight: 700 }}>₹{b.total_price || b.total_amount || 0}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge badge-${(b.booking_status || b.status || "PENDING").toLowerCase()}`}>
                              {b.booking_status || b.status || "PENDING"}
                            </span>
                          </td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge badge-${(b.payment_status || "PENDING").toLowerCase()}`}>
                              {b.payment_status || "PENDING"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 5: Financial Ledger (Revenue, Transactions, Remaining) */}
            {activeTab === "ledger" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>Financial Ledger & Transactions</h1>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Total Revenue</h3>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-color)" }}>₹{stats.totalRevenue || 0}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Pending Amount</h3>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--warning-color)" }}>₹{stats.pendingAmount || 0}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ fontSize: "1.1rem", color: "var(--text-secondary)", marginBottom: "0.5rem" }}>Remaining Amount</h3>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--info-color)" }}>₹{stats.remainingAmount || 0}</div>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Transaction ID</th>
                        <th style={{ padding: "1rem" }}>Booking Code</th>
                        <th style={{ padding: "1rem" }}>Client</th>
                        <th style={{ padding: "1rem" }}>Artist</th>
                        <th style={{ padding: "1rem" }}>Paid Amount</th>
                        <th style={{ padding: "1rem" }}>Method</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>{p.razorpay_payment_id || p.transaction_id || `TXN-${p.id}`}</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{p.booking?.booking_code || p.booking_code || `MG-${p.booking_id}`}</td>
                          <td style={{ padding: "1rem" }}>{p.booking?.user?.name || p.customer_name || "Client"}</td>
                          <td style={{ padding: "1rem" }}>{p.booking?.artist?.user?.name || p.artist_name || "Artist"}</td>
                          <td style={{ padding: "1rem", color: "var(--success-color)", fontWeight: 700 }}>₹{p.amount}</td>
                          <td style={{ padding: "1rem" }}>{p.payment_method}</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge ${p.status === "SUCCESS" ? "badge-success" : p.status === "FAILED" ? "badge-danger" : "badge-secondary"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.85rem" }}>{formatAdminDateTime(p.paid_at || p.created_at || p.createdAt || p)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 6: Chat Activity Monitor */}
            {activeTab === "chats" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>In-App Chat Monitoring</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "1.5rem" }}>
                  Monitor platform messaging history and dialogue logs for security audits.
                </p>
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Sender</th>
                        <th style={{ padding: "1rem" }}>Receiver</th>
                        <th style={{ padding: "1rem" }}>Message Content</th>
                        <th style={{ padding: "1rem" }}>Seen Status</th>
                        <th style={{ padding: "1rem" }}>Sent At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {chats.map((c) => (
                        <tr key={c.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{c.sender?.name} ({c.sender?.role})</td>
                          <td style={{ padding: "1rem", fontWeight: 600 }}>{c.receiver?.name} ({c.receiver?.role})</td>
                          <td style={{ padding: "1rem", fontStyle: "italic" }}>"{c.message}"</td>
                          <td style={{ padding: "1rem" }}>
                            <span className={`badge ${c.is_read ? "badge-success" : "badge-secondary"}`}>
                              {c.is_read ? "Read" : "Sent"}
                            </span>
                          </td>
                          <td style={{ padding: "1rem", fontSize: "0.85rem" }}>{formatAdminDateTime(c.created_at || c.createdAt || c.timestamp || c)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Customer Review Moderation & Approvals */}
            {activeTab === "reviews" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800 }}>Customer Reviews Moderation</h1>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
                      Approve customer reviews before they are published to artist profiles and calculated into ratings.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      className={`btn ${reviewFilter === "PENDING" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setReviewFilter("PENDING")}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      Pending Approval
                    </button>
                    <button
                      className={`btn ${reviewFilter === "APPROVED" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setReviewFilter("APPROVED")}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      Approved & Live
                    </button>
                    <button
                      className={`btn ${reviewFilter === "REJECTED" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setReviewFilter("REJECTED")}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      Rejected
                    </button>
                    <button
                      className={`btn ${reviewFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                      onClick={() => setReviewFilter("ALL")}
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
                    >
                      All Reviews
                    </button>
                  </div>
                </div>

                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                        <th style={{ padding: "1rem" }}>Customer</th>
                        <th style={{ padding: "1rem" }}>Artist</th>
                        <th style={{ padding: "1rem" }}>Rating</th>
                        <th style={{ padding: "1rem" }}>Feedback / Review</th>
                        <th style={{ padding: "1rem" }}>Status</th>
                        <th style={{ padding: "1rem" }}>Submitted At</th>
                        <th style={{ padding: "1rem", textAlign: "center" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminReviews.length === 0 ? (
                        <tr>
                          <td colSpan="7" style={{ textAlign: "center", padding: "2.5rem", color: "var(--text-secondary)" }}>
                            No reviews found under "{reviewFilter}" filter.
                          </td>
                        </tr>
                      ) : (
                        adminReviews.map((r) => (
                          <tr key={r.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                            <td style={{ padding: "1rem", fontWeight: 600 }}>
                              {r.customer_name}
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                                {r.customer_email || r.customer_phone || `ID: ${r.customer_id}`}
                              </div>
                            </td>
                            <td style={{ padding: "1rem", fontWeight: 600 }}>
                              {r.artist_name}
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", fontWeight: 400 }}>
                                {r.artist_email || `Artist ID: ${r.artist_id}`}
                              </div>
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <span style={{ fontWeight: 700, color: "#FFB800" }}>
                                {"⭐".repeat(Math.min(5, Math.max(1, r.rating)))} {Number(r.rating).toFixed(1)}
                              </span>
                            </td>
                            <td style={{ padding: "1rem", maxWidth: "280px" }}>
                              <div style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>
                                "{r.comment || "No written text"}"
                              </div>
                              {r.booking_id && (
                                <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                                  Booking #{r.booking_id}
                                </div>
                              )}
                            </td>
                            <td style={{ padding: "1rem" }}>
                              <span className={`badge ${
                                r.status === "APPROVED" ? "badge-success" :
                                r.status === "REJECTED" ? "badge-danger" : "badge-warning"
                              }`}>
                                {r.status === "APPROVED" ? "Live on Profile" : r.status === "REJECTED" ? "Rejected" : "Pending Review"}
                              </span>
                            </td>
                            <td style={{ padding: "1rem", fontSize: "0.85rem" }}>
                              {formatAdminDateTime(r.created_at || r.createdAt || r)}
                            </td>
                            <td style={{ padding: "1rem", textAlign: "center" }}>
                              <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
                                {r.status !== "APPROVED" && (
                                  <button
                                    className="btn btn-primary"
                                    onClick={() => handleApproveReview(r.id)}
                                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", background: "var(--success-color)", border: "none" }}
                                    title="Approve and publish to artist profile"
                                  >
                                    <Check style={{ width: "14px" }} /> Approve
                                  </button>
                                )}
                                {r.status !== "REJECTED" && (
                                  <button
                                    className="btn btn-danger"
                                    onClick={() => handleRejectReview(r.id)}
                                    style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                                    title="Reject review"
                                  >
                                    <X style={{ width: "14px" }} /> Reject
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 7: Dispatch Broadcaster */}
            {activeTab === "notifications" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "2rem" }}>System Alerts Broadcaster</h1>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
                  {/* Send Alert form */}
                  <div className="glass-panel" style={{ padding: "2rem", height: "fit-content" }}>
                    <h3 style={{ marginBottom: "1.2rem" }}>Dispatch Notification</h3>
                    <form onSubmit={handleSendNotification}>
                      <div className="form-group">
                        <label className="form-label">Recipient User</label>
                        <select className="form-control" value={targetUserId} onChange={(e) => setTargetUserId(e.target.value)} required>
                          <option value="">Select Target User</option>
                          <option value="ALL">All Users & Artists</option>
                          <option value="ALL_USERS">All Users</option>
                          <option value="ALL_ARTISTS">All Artists</option>
                          {users.map(u => (
                            <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Alert Title</label>
                        <input type="text" className="form-control" placeholder="e.g. Schedule Update" value={notifTitle} onChange={(e) => setNotifTitle(e.target.value)} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Notification Message</label>
                        <textarea className="form-control" rows="4" placeholder="Type notification details here..." value={notifMessage} onChange={(e) => setNotifMessage(e.target.value)} required />
                      </div>

                      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={notifSending}>
                        <Send style={{ width: "16px" }} /> {notifSending ? "Dispatching..." : "Broadcast Alert"}
                      </button>
                    </form>
                  </div>

                  {/* Sent Alerts log */}
                  <div>
                    <h3 style={{ marginBottom: "1.2rem" }}>Broadcast Notification Log</h3>
                    {notifications.length === 0 ? (
                      <p style={{ color: "var(--text-secondary)" }}>No notifications sent yet.</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                        {notifications.map(n => (
                          <div key={n.id} className="glass-panel" style={{ padding: "1.2rem" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                              <span style={{ fontWeight: 700, color: "var(--accent-color)" }}>{n.title}</span>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>To: {n.user?.name} ({n.user?.role})</span>
                            </div>
                            <p style={{ fontSize: "0.9rem", marginTop: "0.4rem", color: "var(--text-secondary)" }}>{n.message}</p>
                            <div style={{ fontSize: "0.75rem", textAlign: "right", marginTop: "0.4rem", color: "var(--text-secondary)" }}>
                              {formatAdminDateTime(n.created_at || n.createdAt || n)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 8: Coupons Manager */}
            {activeTab === "coupons" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Promotional Coupons</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Configure flat/percentage codes and restrict booking applications.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => {
                    setEditingCoupon(null);
                    setShowCouponForm(!showCouponForm);
                    setCouponFormData({
                      code: "",
                      discount_type: "PERCENTAGE",
                      discount_value: "",
                      max_discount: "",
                      min_booking_value: "",
                      expires_at: "",
                      is_active: true,
                      first_booking_only: false
                    });
                  }}>
                    <Plus style={{ width: "16px", marginRight: "4px" }} /> {showCouponForm ? "Hide Form" : "Create Coupon"}
                  </button>
                </div>

                {showCouponForm && (
                  <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem" }}>
                    <h3 style={{ marginBottom: "1.5rem" }}>{editingCoupon ? "Edit Coupon Details" : "Create Promo Code"}</h3>
                    <form onSubmit={handleCouponSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                      <div className="form-group">
                        <label className="form-label">Coupon Code</label>
                        <input className="form-control" type="text" placeholder="e.g. WELCOME500" value={couponFormData.code} onChange={(e) => setCouponFormData({ ...couponFormData, code: e.target.value.toUpperCase() })} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discount Type</label>
                        <select className="form-control" value={couponFormData.discount_type} onChange={(e) => setCouponFormData({ ...couponFormData, discount_type: e.target.value })}>
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FLAT">Flat Rate (₹)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discount Value ({couponFormData.discount_type === "PERCENTAGE" ? "%" : "₹"})</label>
                        <input className="form-control" type="number" placeholder="Value" value={couponFormData.discount_value} onChange={(e) => setCouponFormData({ ...couponFormData, discount_value: e.target.value })} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Maximum Discount Cap (₹)</label>
                        <input className="form-control" type="number" placeholder="Cap Limit" value={couponFormData.max_discount} onChange={(e) => setCouponFormData({ ...couponFormData, max_discount: e.target.value })} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Minimum Booking Value Required (₹)</label>
                        <input className="form-control" type="number" placeholder="Minimum Value" value={couponFormData.min_booking_value} onChange={(e) => setCouponFormData({ ...couponFormData, min_booking_value: e.target.value })} required />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Expiry Date</label>
                        <input className="form-control" type="date" value={formatDateForInput(couponFormData.expires_at)} onChange={(e) => setCouponFormData({ ...couponFormData, expires_at: e.target.value })} required />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2", display: "flex", gap: "2rem", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input type="checkbox" checked={couponFormData.first_booking_only} onChange={(e) => setCouponFormData({ ...couponFormData, first_booking_only: e.target.checked })} />
                          First Booking Only
                        </label>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input type="checkbox" checked={couponFormData.is_active} onChange={(e) => setCouponFormData({ ...couponFormData, is_active: e.target.checked })} />
                          Active
                        </label>
                      </div>

                      <div style={{ gridColumn: "span 2", display: "flex", gap: "1rem" }}>
                        <button type="submit" className="btn btn-primary">{editingCoupon ? "Save Changes" : "Save Coupon"}</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowCouponForm(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="glass-panel" style={{ overflowX: "auto", width: "100%" }}>
                  <table className="table" style={{ width: "100%", minWidth: "750px" }}>
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Offer Type</th>
                        <th>Value</th>
                        <th>Min Order</th>
                        <th>Used Count</th>
                        <th>Validity Limit</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {coupons.length === 0 ? (
                        <tr>
                          <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                            No coupon codes configured yet.
                          </td>
                        </tr>
                      ) : (
                        coupons.map((coupon) => (
                          <tr key={coupon.id}>
                            <td style={{ fontWeight: 800 }}>{coupon.code}</td>
                            <td>{(coupon.discount_type || "PERCENTAGE").toUpperCase()}</td>
                            <td>{String(coupon.discount_type).toUpperCase() === "PERCENTAGE" ? `${coupon.discount_percentage || coupon.discount_value}%` : `₹${coupon.discount_value}`}</td>
                            <td>₹{coupon.min_booking_value ?? coupon.min_order_amount ?? 0}</td>
                            <td>{coupon.used_count || 0}</td>
                            <td>{formatAdminDate(coupon.expires_at || coupon.expiresAt)}</td>
                            <td>
                              <span className={`badge ${coupon.is_active && !isDateExpired(coupon.expires_at || coupon.expiresAt) ? "badge-success" : "badge-danger"}`}>
                                {coupon.is_active && !isDateExpired(coupon.expires_at || coupon.expiresAt) ? "Active" : "Expired / Inactive"}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: "flex", gap: "0.5rem" }}>
                                <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }} onClick={() => {
                                  setEditingCoupon(coupon);
                                  setCouponFormData({
                                    code: coupon.code,
                                    discount_type: coupon.discount_type,
                                    discount_value: coupon.discount_value || coupon.discount_percentage,
                                    max_discount: coupon.max_discount,
                                    min_booking_value: coupon.min_booking_value,
                                    expires_at: coupon.expires_at,
                                    is_active: coupon.is_active,
                                    first_booking_only: coupon.first_booking_only
                                  });
                                  setShowCouponForm(true);
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}>Edit</button>
                                <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }} onClick={() => handleDeleteCoupon(coupon.id)}>
                                  <Trash style={{ width: "14px" }} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "festivals" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.25rem" }}>Festivals & Offers Engine 🪔</h1>
                    <p style={{ color: "var(--text-secondary)" }}>
                      Dynamic multi-year Indian festival calendar, auto-promoted banner sliders & linked promo coupons.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <div style={{ display: "inline-flex", background: "var(--bg-secondary, rgba(255,255,255,0.05))", padding: "3px", borderRadius: "8px", border: "1px solid var(--border-color, rgba(255,255,255,0.1))" }}>
                      <button
                        className={`btn ${festivalTabMode === "festivals" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", borderRadius: "6px" }}
                        onClick={() => setFestivalTabMode("festivals")}
                      >
                        📅 Festivals ({festivals.length})
                      </button>
                      <button
                        className={`btn ${festivalTabMode === "offers" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", borderRadius: "6px" }}
                        onClick={() => setFestivalTabMode("offers")}
                      >
                        🏷️ Offers & Banners ({festivalOffers.length})
                      </button>
                    </div>

                    {festivalTabMode === "festivals" ? (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setEditingFestival(null);
                          setFestivalForm({
                            name: "",
                            code: "",
                            tagline: "",
                            description: "",
                            start_date: "",
                            end_date: "",
                            banner_image: "",
                            theme_color: "#800020",
                            badge_text: "FESTIVAL SPECIAL ✨",
                            priority: 50,
                            is_active: true
                          });
                          setShowFestivalModal(true);
                        }}
                      >
                        <Plus style={{ width: "16px", marginRight: "4px" }} /> Add Festival
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary"
                        onClick={() => {
                          setEditingOffer(null);
                          setOfferForm({
                            festival_id: festivals[0]?.id || "",
                            title: "",
                            subtitle: "",
                            description: "",
                            coupon_code: "",
                            discount_type: "PERCENTAGE",
                            discount_value: 20,
                            min_booking_amount: 500,
                            max_discount: 500,
                            valid_from: "",
                            valid_until: "",
                            eligible_categories: "*",
                            terms_conditions: "",
                            banner_image: "",
                            priority: 50,
                            is_active: true
                          });
                          setShowOfferModal(true);
                        }}
                      >
                        <Plus style={{ width: "16px", marginRight: "4px" }} /> Create Offer
                      </button>
                    )}

                    <button className="btn btn-secondary" onClick={() => fetchFestivalsData()}>
                      <RefreshCw style={{ width: "16px" }} />
                    </button>
                  </div>
                </div>

                {/* Festival Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.25rem", marginBottom: "2rem" }}>
                  <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #F59E0B" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Total Festivals</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.4rem", color: "#F59E0B" }}>{festivals.length}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Configured in Cloudflare D1</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #10B981" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Active Today (IST)</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.4rem", color: "#10B981" }}>
                      {festivals.filter(f => f.is_active && (f.status === "ACTIVE" || f.is_current_active)).length || festivals.filter(f => {
                        const today = new Date().toISOString().slice(0, 10);
                        return f.is_active && f.start_date <= today && f.end_date >= today;
                      }).length}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Promoted on mobile home slider</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #3B82F6" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Upcoming Scheduled</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.4rem", color: "#3B82F6" }}>
                      {festivals.filter(f => {
                        const today = new Date().toISOString().slice(0, 10);
                        return f.is_active && f.start_date > today;
                      }).length}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Next in calendar pipeline</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.25rem", borderLeft: "4px solid #8B5CF6" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Linked Coupon Offers</div>
                    <div style={{ fontSize: "1.8rem", fontWeight: 800, marginTop: "0.4rem", color: "#8B5CF6" }}>
                      {festivalOffers.filter(o => o.is_active).length} / {festivalOffers.length}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>Active checkout discounts</div>
                  </div>
                </div>

                {/* Festival Form Modal */}
                {showFestivalModal && (
                  <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem", border: "1px solid var(--accent-color, #800020)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                        {editingFestival ? `Edit Festival: ${editingFestival.name}` : "Add New Indian Festival to Calendar"}
                      </h3>
                      <button className="btn btn-secondary" onClick={() => setShowFestivalModal(false)}>✕</button>
                    </div>

                    <form onSubmit={handleSaveFestival} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div className="form-group">
                        <label className="form-label">Festival Name (with Emoji)</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. Karwa Chauth 🌙"
                          value={festivalForm.name}
                          onChange={(e) => setFestivalForm({ ...festivalForm, name: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Festival Code Key</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. karwa_chauth"
                          value={festivalForm.code}
                          onChange={(e) => setFestivalForm({ ...festivalForm, code: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Tagline / Short Subtitle</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. Royal Bridal & Marwari Henna"
                          value={festivalForm.tagline}
                          onChange={(e) => setFestivalForm({ ...festivalForm, tagline: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Badge Text</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. KARWA SPECIAL 🌙"
                          value={festivalForm.badge_text}
                          onChange={(e) => setFestivalForm({ ...festivalForm, badge_text: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Active Start Date (YYYY-MM-DD)</label>
                        <input
                          className="form-control"
                          type="date"
                          value={formatDateForInput(festivalForm.start_date)}
                          onChange={(e) => setFestivalForm({ ...festivalForm, start_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Active End Date (YYYY-MM-DD)</label>
                        <input
                          className="form-control"
                          type="date"
                          value={formatDateForInput(festivalForm.end_date)}
                          onChange={(e) => setFestivalForm({ ...festivalForm, end_date: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Theme Color (Hex code)</label>
                        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                          <input
                            type="color"
                            value={festivalForm.theme_color || "#800020"}
                            onChange={(e) => setFestivalForm({ ...festivalForm, theme_color: e.target.value })}
                            style={{ width: "40px", height: "38px", padding: 0, border: "none", borderRadius: "6px", cursor: "pointer" }}
                          />
                          <input
                            className="form-control"
                            type="text"
                            value={festivalForm.theme_color}
                            onChange={(e) => setFestivalForm({ ...festivalForm, theme_color: e.target.value })}
                            placeholder="#800020"
                          />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Slider Priority (1-100, higher shows first)</label>
                        <input
                          className="form-control"
                          type="number"
                          value={festivalForm.priority}
                          onChange={(e) => setFestivalForm({ ...festivalForm, priority: Number(e.target.value) })}
                          min="1"
                          max="100"
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="form-label">Banner Image URL</label>
                        <input
                          className="form-control"
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={festivalForm.banner_image}
                          onChange={(e) => setFestivalForm({ ...festivalForm, banner_image: e.target.value })}
                        />
                        {festivalForm.banner_image && (
                          <div style={{ marginTop: "0.75rem", borderRadius: "8px", overflow: "hidden", height: "100px", maxWidth: "300px", border: "1px solid var(--border-color)" }}>
                            <img src={festivalForm.banner_image} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="form-label">Festival Description</label>
                        <textarea
                          className="form-control"
                          rows="2"
                          placeholder="Short festive description for customer app..."
                          value={festivalForm.description}
                          onChange={(e) => setFestivalForm({ ...festivalForm, description: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2", display: "flex", gap: "1rem", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(festivalForm.is_active)}
                            onChange={(e) => setFestivalForm({ ...festivalForm, is_active: e.target.checked })}
                          />
                          <span style={{ fontWeight: 600 }}>Enable & Activate Festival in App</span>
                        </label>
                      </div>

                      <div style={{ gridColumn: "span 2", display: "flex", gap: "1rem" }}>
                        <button type="submit" className="btn btn-primary">
                          {editingFestival ? "Update Festival" : "Save to Festival Calendar"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowFestivalModal(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Festival Offer Form Modal */}
                {showOfferModal && (
                  <div className="glass-panel" style={{ padding: "2rem", marginBottom: "2rem", border: "1px solid var(--accent-color, #800020)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                      <h3 style={{ fontSize: "1.25rem", fontWeight: 700 }}>
                        {editingOffer ? `Edit Offer: ${editingOffer.title}` : "Create Festival Promo Offer & Coupon"}
                      </h3>
                      <button className="btn btn-secondary" onClick={() => setShowOfferModal(false)}>✕</button>
                    </div>

                    <form onSubmit={handleSaveOffer} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.25rem" }}>
                      <div className="form-group">
                        <label className="form-label">Linked Festival</label>
                        <select
                          className="form-control"
                          value={offerForm.festival_id}
                          onChange={(e) => setOfferForm({ ...offerForm, festival_id: Number(e.target.value) })}
                          required
                        >
                          <option value="">-- Select Festival --</option>
                          {festivals.map(f => (
                            <option key={f.id} value={f.id}>{f.name} ({f.start_date} to {f.end_date})</option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Coupon Promo Code</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. KARWA500"
                          value={offerForm.coupon_code}
                          onChange={(e) => setOfferForm({ ...offerForm, coupon_code: e.target.value.toUpperCase().trim() })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Offer Title</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. Karwa Chauth Luxury Henna 🌙"
                          value={offerForm.title}
                          onChange={(e) => setOfferForm({ ...offerForm, title: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Subtitle</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. Flat ₹500 OFF on bridal packages"
                          value={offerForm.subtitle}
                          onChange={(e) => setOfferForm({ ...offerForm, subtitle: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discount Type</label>
                        <select
                          className="form-control"
                          value={offerForm.discount_type}
                          onChange={(e) => setOfferForm({ ...offerForm, discount_type: e.target.value })}
                        >
                          <option value="PERCENTAGE">Percentage (%)</option>
                          <option value="FLAT">Flat Rate (₹)</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Discount Value ({offerForm.discount_type === "PERCENTAGE" ? "%" : "₹"})</label>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="e.g. 25"
                          value={offerForm.discount_value}
                          onChange={(e) => setOfferForm({ ...offerForm, discount_value: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Min Booking Amount (₹)</label>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="e.g. 500"
                          value={offerForm.min_booking_amount}
                          onChange={(e) => setOfferForm({ ...offerForm, min_booking_amount: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Max Discount Cap (₹)</label>
                        <input
                          className="form-control"
                          type="number"
                          placeholder="e.g. 1000"
                          value={offerForm.max_discount}
                          onChange={(e) => setOfferForm({ ...offerForm, max_discount: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Valid From (YYYY-MM-DD)</label>
                        <input
                          className="form-control"
                          type="date"
                          value={formatDateForInput(offerForm.valid_from)}
                          onChange={(e) => setOfferForm({ ...offerForm, valid_from: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">Valid Until (YYYY-MM-DD)</label>
                        <input
                          className="form-control"
                          type="date"
                          value={formatDateForInput(offerForm.valid_until)}
                          onChange={(e) => setOfferForm({ ...offerForm, valid_until: e.target.value })}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="form-label">Banner / Card Image URL</label>
                        <input
                          className="form-control"
                          type="url"
                          placeholder="https://images.unsplash.com/..."
                          value={offerForm.banner_image}
                          onChange={(e) => setOfferForm({ ...offerForm, banner_image: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="form-label">Terms & Conditions</label>
                        <input
                          className="form-control"
                          type="text"
                          placeholder="e.g. Valid on bridal packages above ₹1500."
                          value={offerForm.terms_conditions}
                          onChange={(e) => setOfferForm({ ...offerForm, terms_conditions: e.target.value })}
                        />
                      </div>

                      <div className="form-group" style={{ gridColumn: "span 2", display: "flex", gap: "1rem", alignItems: "center" }}>
                        <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                          <input
                            type="checkbox"
                            checked={Boolean(offerForm.is_active)}
                            onChange={(e) => setOfferForm({ ...offerForm, is_active: e.target.checked })}
                          />
                          <span style={{ fontWeight: 600 }}>Active Offer (usable at checkout)</span>
                        </label>
                      </div>

                      <div style={{ gridColumn: "span 2", display: "flex", gap: "1rem" }}>
                        <button type="submit" className="btn btn-primary">
                          {editingOffer ? "Update Offer" : "Save Festival Offer"}
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={() => setShowOfferModal(false)}>
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Table Views */}
                {festivalTabMode === "festivals" ? (
                  <div className="glass-panel" style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Festival Name</th>
                          <th>Badge</th>
                          <th>Theme Color</th>
                          <th>Date Window (IST)</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Banner</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {festivals.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                              No festivals configured. Click "Add Festival" to seed Indian occasions.
                            </td>
                          </tr>
                        ) : (
                          festivals.map((fest) => {
                            const today = new Date().toISOString().slice(0, 10);
                            const isActiveToday = fest.is_active && fest.start_date <= today && fest.end_date >= today;
                            const isUpcoming = fest.is_active && fest.start_date > today;
                            const isExpired = fest.end_date < today;

                            return (
                              <tr key={fest.id}>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{fest.name}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{fest.tagline || fest.code}</div>
                                </td>
                                <td>
                                  <span style={{
                                    background: fest.theme_color || "var(--accent-color)",
                                    color: "#FFF",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    padding: "3px 8px",
                                    borderRadius: "4px"
                                  }}>
                                    {fest.badge_text || "SPECIAL"}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                                    <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: fest.theme_color || "#800020", border: "1px solid rgba(255,255,255,0.2)" }} />
                                    <span style={{ fontSize: "0.8rem", fontFamily: "monospace" }}>{fest.theme_color || "#800020"}</span>
                                  </div>
                                </td>
                                <td>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{fest.start_date} → {fest.end_date}</div>
                                </td>
                                <td>
                                  {!fest.is_active ? (
                                    <span className="badge badge-danger">Disabled</span>
                                  ) : isActiveToday ? (
                                    <span className="badge badge-success">🔥 Active Today</span>
                                  ) : isUpcoming ? (
                                    <span className="badge badge-info">⏳ Upcoming</span>
                                  ) : (
                                    <span className="badge badge-secondary">Past / Season Over</span>
                                  )}
                                </td>
                                <td>
                                  <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{fest.priority || 50}</span>
                                </td>
                                <td>
                                  {fest.banner_image ? (
                                    <img
                                      src={fest.banner_image}
                                      alt={fest.name}
                                      style={{ width: "60px", height: "36px", objectFit: "cover", borderRadius: "4px" }}
                                    />
                                  ) : (
                                    <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>No Image</span>
                                  )}
                                </td>
                                <td>
                                  <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: "0.25rem 0.5rem", minHeight: "auto", fontSize: "0.8rem" }}
                                      onClick={() => {
                                        setEditingFestival(fest);
                                        setFestivalForm({
                                          name: fest.name,
                                          code: fest.code,
                                          tagline: fest.tagline || "",
                                          description: fest.description || "",
                                          start_date: fest.start_date,
                                          end_date: fest.end_date,
                                          banner_image: fest.banner_image || "",
                                          theme_color: fest.theme_color || "#800020",
                                          badge_text: fest.badge_text || "FESTIVAL SPECIAL ✨",
                                          priority: fest.priority || 50,
                                          is_active: Boolean(fest.is_active)
                                        });
                                        setShowFestivalModal(true);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className={`btn ${fest.is_active ? "btn-warning" : "btn-success"}`}
                                      style={{ padding: "0.25rem 0.5rem", minHeight: "auto", fontSize: "0.8rem" }}
                                      onClick={() => handleToggleFestivalStatus(fest)}
                                    >
                                      {fest.is_active ? "Pause" : "Resume"}
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }}
                                      onClick={() => handleDeleteFestival(fest.id)}
                                    >
                                      <Trash style={{ width: "14px" }} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ overflowX: "auto" }}>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Offer Title</th>
                          <th>Coupon Code</th>
                          <th>Discount</th>
                          <th>Min Order / Cap</th>
                          <th>Validity Period</th>
                          <th>Status</th>
                          <th>Priority</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {festivalOffers.length === 0 ? (
                          <tr>
                            <td colSpan="8" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                              No festival offers configured. Click "Create Offer" to link a coupon discount.
                            </td>
                          </tr>
                        ) : (
                          festivalOffers.map((off) => {
                            const isFlat = off.discount_type === "FLAT" || off.discount_type === "fixed";
                            const discountText = isFlat ? `₹${off.discount_value} FLAT` : `${off.discount_value}% OFF`;

                            return (
                              <tr key={off.id}>
                                <td>
                                  <div style={{ fontWeight: 700 }}>{off.title}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{off.subtitle || off.description}</div>
                                </td>
                                <td>
                                  <span style={{
                                    background: "rgba(255,255,255,0.1)",
                                    border: "1px dashed var(--accent-color, #800020)",
                                    padding: "3px 8px",
                                    borderRadius: "4px",
                                    fontWeight: 800,
                                    letterSpacing: "1px",
                                    fontSize: "0.85rem"
                                  }}>
                                    {off.coupon_code}
                                  </span>
                                </td>
                                <td>
                                  <span style={{ fontWeight: 800, color: "var(--accent-color, #10B981)" }}>{discountText}</span>
                                </td>
                                <td>
                                  <div style={{ fontSize: "0.85rem" }}>Min: ₹{off.min_booking_amount || 0}</div>
                                  <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Cap: ₹{off.max_discount || "No Cap"}</div>
                                </td>
                                <td>
                                  <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>{off.valid_from} → {off.valid_until}</div>
                                </td>
                                <td>
                                  <span className={`badge ${off.is_active ? "badge-success" : "badge-danger"}`}>
                                    {off.is_active ? "Active" : "Disabled"}
                                  </span>
                                </td>
                                <td>{off.priority || 50}</td>
                                <td>
                                  <div style={{ display: "flex", gap: "0.4rem" }}>
                                    <button
                                      className="btn btn-secondary"
                                      style={{ padding: "0.25rem 0.5rem", minHeight: "auto", fontSize: "0.8rem" }}
                                      onClick={() => {
                                        setEditingOffer(off);
                                        setOfferForm({
                                          festival_id: off.festival_id || "",
                                          title: off.title,
                                          subtitle: off.subtitle || "",
                                          description: off.description || "",
                                          coupon_code: off.coupon_code,
                                          discount_type: off.discount_type || "PERCENTAGE",
                                          discount_value: off.discount_value,
                                          min_booking_amount: off.min_booking_amount || 0,
                                          max_discount: off.max_discount || 0,
                                          valid_from: off.valid_from,
                                          valid_until: off.valid_until,
                                          eligible_categories: Array.isArray(off.eligible_categories) ? off.eligible_categories.join(", ") : (off.eligible_categories || "*"),
                                          terms_conditions: off.terms_conditions || "",
                                          banner_image: off.banner_image || "",
                                          priority: off.priority || 50,
                                          is_active: Boolean(off.is_active)
                                        });
                                        setShowOfferModal(true);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      className={`btn ${off.is_active ? "btn-warning" : "btn-success"}`}
                                      style={{ padding: "0.25rem 0.5rem", minHeight: "auto", fontSize: "0.8rem" }}
                                      onClick={() => handleToggleOfferStatus(off)}
                                    >
                                      {off.is_active ? "Pause" : "Resume"}
                                    </button>
                                    <button
                                      className="btn btn-danger"
                                      style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }}
                                      onClick={() => handleDeleteOffer(off.id)}
                                    >
                                      <Trash style={{ width: "14px" }} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "categories" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                  <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Categories Management</h2>
                  <button className="btn btn-primary" onClick={() => handleOpenCategoryModal()}>
                    <Plus style={{ width: "16px", marginRight: "0.25rem" }} /> Add Category
                  </button>
                </div>

                {categoryModalOpen && (
                  <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                    <h3>{categoryEditId ? "Edit Category" : "Add New Category"}</h3>
                    <form onSubmit={handleSaveCategory} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                      <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="form-label">Category Title</label>
                        <input className="form-control" type="text" placeholder="e.g. Bridal Mehndi, Arabian Style" value={categoryTitle} onChange={(e) => setCategoryTitle(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">URL Slug (Optional)</label>
                        <input className="form-control" type="text" placeholder="e.g. bridal-mehndi" value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Category Image File</label>
                        <input className="form-control" type="file" accept="image/*" onChange={(e) => setCategoryImageFile(e.target.files[0])} />
                      </div>
                      <div className="form-group" style={{ gridColumn: "span 2" }}>
                        <label className="form-label">Description</label>
                        <textarea className="form-control" rows="3" placeholder="Category details..." value={categoryDescription} onChange={(e) => setCategoryDescription(e.target.value)} />
                      </div>
                      <div style={{ gridColumn: "span 2", display: "flex", gap: "1rem" }}>
                        <button type="submit" className="btn btn-primary">Save Category</button>
                        <button type="button" className="btn btn-secondary" onClick={() => setCategoryModalOpen(false)}>Cancel</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="glass-panel" style={{ overflowX: "auto" }}>
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Image</th>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.length === 0 ? (
                        <tr>
                          <td colSpan="6" style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
                            No categories available.
                          </td>
                        </tr>
                      ) : (
                        categories.map((cat) => {
                          const name = cat.specialization_name || cat.title || "";
                          const cleanImage = cat.image ? (cat.image.startsWith("http") ? cat.image : `http://localhost:3000/${cat.image.replace(/^\/+/, "")}`) : "https://images.unsplash.com/photo-1590012357675-bc55909793fb?w=100";
                          return (
                            <tr key={cat.id}>
                              <td>
                                <img src={cleanImage} alt={name} style={{ width: "50px", height: "50px", borderRadius: "8px", objectFit: "cover" }} />
                              </td>
                              <td style={{ fontWeight: 800 }}>{name}</td>
                              <td>{cat.slug}</td>
                              <td style={{ fontSize: "0.85rem", maxWidth: "300px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{cat.description || "N/A"}</td>
                              <td>
                                <span className={`badge ${cat.is_active ? "badge-success" : "badge-danger"}`} style={{ cursor: "pointer" }} onClick={() => handleToggleCategoryStatus(cat.id)}>
                                  {cat.is_active ? "Active" : "Inactive"}
                                </span>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: "0.5rem" }}>
                                  <button className="btn btn-secondary" style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }} onClick={() => handleOpenCategoryModal(cat)}>Edit</button>
                                  <button className="btn btn-danger" style={{ padding: "0.25rem 0.5rem", minHeight: "auto" }} onClick={() => handleDeleteCategory(cat.id)}>
                                    <Trash style={{ width: "14px" }} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab 9: Referrals Dashboard */}
            {activeTab === "referrals" && (
              <div>
                <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Referral Program Settings</h1>
                <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>Configure growth campaigns and review referral conversion logs.</p>

                {/* Growth Analytics Grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Total Referrals</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--primary-color)" }}>{referralAnalytics.totalSignups}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Successful Invites</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--success-color)" }}>{referralAnalytics.completedInvites}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Reward Money Payout</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "var(--accent-color)" }}>₹{referralAnalytics.payoutAmount}</div>
                  </div>
                  <div className="glass-panel" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "0.5rem" }}>Conversion Rate</div>
                    <div style={{ fontSize: "2rem", fontWeight: 850, color: "#e67e22" }}>{referralAnalytics.conversionRate}%</div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: "2rem" }}>
                  {/* Campaign configuration form */}
                  <div className="glass-panel" style={{ padding: "1.5rem", height: "fit-content" }}>
                    <h3 style={{ marginBottom: "1.2rem" }}>Referral Campaign Config</h3>
                    <form onSubmit={handleCampaignSubmit}>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label className="form-label">Campaign Title</label>
                        <input className="form-control" type="text" placeholder="e.g. Monsoon Refer Fest" value={campaignFormData.title} onChange={(e) => setCampaignFormData({ ...campaignFormData, title: e.target.value })} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label className="form-label">Referrer Reward Cashback (₹)</label>
                        <input className="form-control" type="number" placeholder="Referrer gets" value={campaignFormData.referrer_reward} onChange={(e) => setCampaignFormData({ ...campaignFormData, referrer_reward: e.target.value })} required />
                      </div>
                      <div className="form-group" style={{ marginBottom: "1rem" }}>
                        <label className="form-label">Referred Welcome Friend Cashback (₹)</label>
                        <input className="form-control" type="number" placeholder="Friend gets" value={campaignFormData.referred_reward} onChange={(e) => setCampaignFormData({ ...campaignFormData, referred_reward: e.target.value })} required />
                      </div>
                      <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", marginTop: "1rem" }}>
                        <input type="checkbox" checked={campaignFormData.is_active} onChange={(e) => setCampaignFormData({ ...campaignFormData, is_active: e.target.checked })} />
                        Activate immediately
                      </label>
                      <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "1.5rem" }}>
                        Launch Growth Campaign
                      </button>
                    </form>
                  </div>

                  {/* Campaigns List history */}
                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <h3 style={{ marginBottom: "1.2rem" }}>Referral Campaigns History</h3>
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Campaign Title</th>
                          <th>Referrer Reward</th>
                          <th>Friend Reward</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {!Array.isArray(campaigns) || campaigns.length === 0 ? (
                          <tr>
                            <td colSpan="4" style={{ textAlign: "center", padding: "1.5rem", color: "var(--text-secondary)" }}>
                              No campaigns logged yet.
                            </td>
                          </tr>
                        ) : (
                          (Array.isArray(campaigns) ? campaigns : []).map((camp) => (
                            <tr key={camp.id}>
                              <td style={{ fontWeight: 600 }}>{camp.title}</td>
                              <td>₹{camp.referrer_reward}</td>
                              <td>₹{camp.referred_reward}</td>
                              <td>
                                <span className={`badge ${camp.is_active ? "badge-success" : "badge-secondary"}`}>
                                  {camp.is_active ? "Active" : "Archived"}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 10: BI Business Intelligence Analytics */}
            {activeTab === "analytics" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center", marginBottom: "2rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>BI Reports & Business Analytics</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Audit real-time bookings trends, revenues category graphs, and customer retention metrics.</p>
                  </div>

                  {/* Exports panels */}
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => {
                      const params = {
                        reportType: "revenue",
                        startDate: analyticsFilters.startDate || undefined,
                        endDate: analyticsFilters.endDate || undefined,
                        city: analyticsFilters.city || undefined
                      };
                      window.open(`http://localhost:3000/analytics/export?reportType=revenue&startDate=${params.startDate || ""}&endDate=${params.endDate || ""}&city=${params.city || ""}`, "_blank");
                    }}>
                      Export Revenue CSV
                    </button>
                    <button className="btn btn-secondary" onClick={() => {
                      const params = {
                        reportType: "bookings",
                        startDate: analyticsFilters.startDate || undefined,
                        endDate: analyticsFilters.endDate || undefined,
                        city: analyticsFilters.city || undefined
                      };
                      window.open(`http://localhost:3000/analytics/export?reportType=bookings&startDate=${params.startDate || ""}&endDate=${params.endDate || ""}&city=${params.city || ""}`, "_blank");
                    }}>
                      Export Bookings CSV
                    </button>
                  </div>
                </div>

                {/* Filters Panel bar */}
                <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2rem", display: "flex", flexWrap: "wrap", gap: "1.5rem", alignItems: "flex-end" }}>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: "150px" }}>
                    <label className="form-label">Start Date</label>
                    <input className="form-control" type="date" value={analyticsFilters.startDate} onChange={(e) => setAnalyticsFilters({ ...analyticsFilters, startDate: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: "150px" }}>
                    <label className="form-label">End Date</label>
                    <input className="form-control" type="date" value={analyticsFilters.endDate} onChange={(e) => setAnalyticsFilters({ ...analyticsFilters, endDate: e.target.value })} />
                  </div>
                  <div className="form-group" style={{ flexGrow: 1, minWidth: "150px" }}>
                    <label className="form-label">Filter by City</label>
                    <input className="form-control" type="text" placeholder="e.g. Panaji" value={analyticsFilters.city} onChange={(e) => setAnalyticsFilters({ ...analyticsFilters, city: e.target.value })} />
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button className="btn btn-secondary" onClick={() => {
                      const today = formatDateForInput(new Date());
                      setAnalyticsFilters({ ...analyticsFilters, startDate: today, endDate: today });
                    }}>Today</button>
                    <button className="btn btn-secondary" onClick={() => {
                      const end = formatDateForInput(new Date());
                      const start = formatDateForInput(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
                      setAnalyticsFilters({ ...analyticsFilters, startDate: start, endDate: end });
                    }}>Last 7 Days</button>
                    <button className="btn btn-secondary" onClick={() => {
                      setAnalyticsFilters({ startDate: "", endDate: "", city: "", artistId: "" });
                    }}>Reset</button>
                  </div>
                </div>

                {analyticsStats?.kpis && (
                  <div>
                    {/* CEO KPI Summary cards grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid var(--primary-color)" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Platform Profit (20%)</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>₹{analyticsStats.kpis.profit}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #00b894" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Completed Bookings</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>{analyticsStats.kpis.completedBookings}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #ff7675" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Cancelled Bookings</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>{analyticsStats.kpis.cancelledBookings}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #e67e22" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Avg Booking Value</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>₹{analyticsBookings?.avgBookingValue || 0}</div>
                      </div>
                      <div className="glass-panel" style={{ padding: "1.2rem", borderLeft: "4px solid #9b59b6" }}>
                        <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem" }}>Repeat Booking Rate</div>
                        <div style={{ fontSize: "1.8rem", fontWeight: 850, marginTop: "0.4rem" }}>{analyticsCustomers?.repeatBookingRate || 0}%</div>
                      </div>
                    </div>

                    {/* SVG Analytics Charts Row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem", marginBottom: "2rem" }}>

                      {/* 1. Revenue Area/Line SVG Chart */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Revenue Growth Trend (7 Days)</h3>
                        <svg viewBox="0 0 500 200" style={{ width: "100%", height: "200px" }}>
                          <defs>
                            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.4" />
                              <stop offset="100%" stopColor="var(--primary-color)" stopOpacity="0.0" />
                            </linearGradient>
                          </defs>
                          {/* Grid lines */}
                          <line x1="50" y1="20" x2="480" y2="20" stroke="#f1f2f6" strokeWidth="1" />
                          <line x1="50" y1="70" x2="480" y2="70" stroke="#f1f2f6" strokeWidth="1" />
                          <line x1="50" y1="120" x2="480" y2="120" stroke="#f1f2f6" strokeWidth="1" />
                          <line x1="50" y1="170" x2="480" y2="170" stroke="#a4b0be" strokeWidth="1" />

                          {/* SVG Path calculation */}
                          {(() => {
                            const data = analyticsStats.chartsData || [];
                            if (data.length === 0) return null;
                            const maxVal = Math.max(...data.map(d => d.revenue), 1000);
                            const coords = data.map((d, index) => {
                              const x = 50 + index * 70;
                              const y = 170 - (d.revenue / maxVal) * 140;
                              return { x, y };
                            });

                            const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
                            const areaPath = `${linePath} L ${coords[coords.length - 1].x} 170 L ${coords[0].x} 170 Z`;

                            return (
                              <>
                                <path d={areaPath} fill="url(#areaGrad)" />
                                <path d={linePath} fill="none" stroke="var(--primary-color)" strokeWidth="3" />
                                {coords.map((c, i) => (
                                  <g key={i}>
                                    <circle cx={c.x} cy={c.y} r="5" fill="#fff" stroke="var(--primary-color)" strokeWidth="3" />
                                    <text x={c.x} y="190" textAnchor="middle" style={{ fontSize: "10px", fill: "var(--text-secondary)" }}>{data[i].date}</text>
                                    <text x={c.x} y={c.y - 10} textAnchor="middle" style={{ fontSize: "9px", fontWeight: "bold", fill: "var(--text-secondary)" }}>₹{data[i].revenue}</text>
                                  </g>
                                ))}
                              </>
                            );
                          })()}
                        </svg>
                      </div>

                      {/* 2. Donut Category Share Chart */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Revenue Share by Specialty Category</h3>
                        {analyticsRevenue?.byCategory && (
                          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                            <svg viewBox="0 0 200 200" style={{ width: "150px", height: "150px" }}>
                              {/* Simple donut shape fallback visualization */}
                              <circle cx="100" cy="100" r="70" fill="none" stroke="#f1f2f6" strokeWidth="20" />
                              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--primary-color)" strokeWidth="20" strokeDasharray="300 400" />
                              <circle cx="100" cy="100" r="70" fill="none" stroke="var(--accent-color)" strokeWidth="20" strokeDasharray="100 400" strokeDashoffset="-300" />
                            </svg>
                            <div style={{ flexGrow: 1, fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                              {Object.entries(analyticsRevenue.byCategory).slice(0, 4).map(([cat, val], i) => (
                                <div key={cat} style={{ display: "flex", justifyContent: "space-between" }}>
                                  <span style={{ fontWeight: 600 }}>{cat}</span>
                                  <span style={{ color: "var(--text-secondary)" }}>₹{val}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Hourly Heatmap & Top Spenders */}
                    <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: "2rem" }}>

                      {/* Peak Booking Hours Grid Heatmap */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Peak Booking Hours (Heatmap Distribution)</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(12, 1fr)", gap: "0.5rem" }}>
                          {analyticsBookings?.hourlyDistribution?.map((val, hour) => {
                            const maxVal = Math.max(...analyticsBookings.hourlyDistribution, 1);
                            const opacity = Math.max(0.1, val / maxVal);
                            const bg = `rgba(253, 121, 168, ${opacity})`;

                            return (
                              <div
                                key={hour}
                                style={{
                                  background: bg,
                                  color: opacity > 0.6 ? "#fff" : "var(--text-secondary)",
                                  padding: "0.75rem 0.25rem",
                                  borderRadius: "6px",
                                  textAlign: "center",
                                  fontSize: "0.75rem",
                                  fontWeight: "bold"
                                }}
                                title={`${val} bookings at ${hour}:00`}
                              >
                                {hour}h
                                <div style={{ fontSize: "9px", marginTop: "2px", fontWeight: "normal" }}>{val}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Top Spending Customers */}
                      <div className="glass-panel" style={{ padding: "1.5rem" }}>
                        <h3 style={{ marginBottom: "1.2rem" }}>Top Spending Customers</h3>
                        {analyticsCustomers?.topCustomers?.map((item, index) => (
                          <div key={index} style={{ display: "flex", justifyContent: "space-between", paddingVertical: "0.75rem", borderBottom: "1px solid var(--border-color)" }}>
                            <div>
                              <div style={{ fontWeight: 700 }}>{item.user?.name || "Premium User"}</div>
                              <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>{item.user?.email || "N/A"}</div>
                            </div>
                            <div style={{ fontWeight: 800, color: "var(--primary-color)" }}>₹{item.total_spend}</div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 11: Commission Wallet */}
            {activeTab === "wallet" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
                  <div>
                    <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "0.5rem" }}>Commission Wallet</h1>
                    <p style={{ color: "var(--text-secondary)" }}>Track 10% advance payments and overall admin platform commission earnings.</p>
                  </div>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <button
                      className="btn btn-secondary"
                      onClick={async () => {
                        try {
                          const historyRes = await adminService.getCommissionHistory({
                            page: 1,
                            limit: 1000
                          });
                          const txs = historyRes.data?.transactions || [];
                          if (txs.length === 0) {
                            showToast("No transactions found to export", "warning");
                            return;
                          }
                          const headers = ["Booking ID", "Customer Name", "Artist Name", "Total Amount (₹)", "Commission (₹)", "Status", "Date"];
                          const csvContent = "data:text/csv;charset=utf-8,"
                            + headers.join(",") + "\n"
                            + txs.map(t => [
                              t.booking?.booking_code || "N/A",
                              t.booking?.user?.name || "N/A",
                              t.booking?.artist?.user?.name || "N/A",
                              t.booking?.final_amount || 0,
                              t.amount || 0,
                              t.status || "SUCCESS",
                              formatAdminDateTime(t.created_at || t.createdAt || t)
                            ].map(val => `"${val}"`).join(",")).join("\n");
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `Commission_Ledger_${Date.now()}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          showToast("CSV exported successfully", "success");
                        } catch (err) {
                          showToast("Export failed: " + err.message, "danger");
                        }
                      }}
                    >
                      Export CSV
                    </button>
                    <button
                      className="btn btn-primary"
                      onClick={() => fetchAdminData()}
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Dashboard Summary Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2.5rem" }}>
                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--accent-color)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Wallet Balance</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--accent-color)", marginTop: "0.5rem" }}>₹{walletSummary.balance}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Available for withdrawal/disbursement</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--success-color)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Today's Earnings</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--success-color)", marginTop: "0.5rem" }}>₹{walletDashboardSummary.today}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Commission earned today</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>This Month's Earnings</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.5rem" }}>₹{walletDashboardSummary.monthly}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Current billing cycle</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Lifetime Commission</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, marginTop: "0.5rem" }}>₹{walletDashboardSummary.lifetime}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>Cumulatively earned commission</div>
                  </div>

                  <div className="glass-panel" style={{ padding: "1.5rem", borderLeft: "4px solid var(--warning-color)" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.85rem", fontWeight: 600 }}>Pending Settlements</div>
                    <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--warning-color)", marginTop: "0.5rem" }}>₹{walletSummary.totalPendingSettlement}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem" }}>90% outstanding balance of active bookings</div>
                  </div>
                </div>

                {/* Filters */}
                <div className="glass-panel" style={{ padding: "1.5rem", marginBottom: "2.5rem" }}>
                  <h3 style={{ marginBottom: "1.2rem", fontSize: "1.1rem" }}>Filters</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: "1rem", alignItems: "end" }}>
                    <div className="form-group">
                      <label className="form-label">Search</label>
                      <input
                        className="form-control"
                        type="text"
                        placeholder="Search by Booking ID or client name..."
                        value={walletSearch}
                        onChange={(e) => setWalletSearch(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Status</label>
                      <select
                        className="form-control"
                        value={walletStatusFilter}
                        onChange={(e) => setWalletStatusFilter(e.target.value)}
                      >
                        <option value="">All Statuses</option>
                        <option value="SUCCESS">SUCCESS</option>
                        <option value="PENDING">PENDING</option>
                        <option value="FAILED">FAILED</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Start Date</label>
                      <input
                        className="form-control"
                        type="date"
                        value={walletStartDate}
                        onChange={(e) => setWalletStartDate(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">End Date</label>
                      <input
                        className="form-control"
                        type="date"
                        value={walletEndDate}
                        onChange={(e) => setWalletEndDate(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* Commission Ledger Table */}
                <div className="glass-panel" style={{ padding: "1.5rem", overflowX: "auto" }}>
                  <h3 style={{ marginBottom: "1.5rem", fontSize: "1.1rem" }}>Transactions Log</h3>
                  {walletLoading ? (
                    <div style={{ display: "flex", justifyContent: "center", padding: "3rem" }}>
                      <span style={{ fontSize: "1.2rem", fontWeight: 600 }}>Loading transactions...</span>
                    </div>
                  ) : commissionHistory.length === 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "4rem" }}>
                      <ShieldAlert style={{ width: "48px", height: "48px", color: "var(--text-secondary)", marginBottom: "1rem" }} />
                      <p style={{ color: "var(--text-secondary)", fontWeight: 600 }}>No commission transactions found matching the filters.</p>
                    </div>
                  ) : (
                    <div>
                      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left" }}>
                        <thead>
                          <tr style={{ borderBottom: "2px solid var(--border-color)" }}>
                            <th style={{ padding: "1rem" }}>Booking ID</th>
                            <th style={{ padding: "1rem" }}>Customer</th>
                            <th style={{ padding: "1rem" }}>Artist</th>
                            <th style={{ padding: "1rem" }}>Booking Amount</th>
                            <th style={{ padding: "1rem" }}>10% Commission</th>
                            <th style={{ padding: "1rem" }}>Tx ID</th>
                            <th style={{ padding: "1rem" }}>Status</th>
                            <th style={{ padding: "1rem" }}>Date</th>
                            <th style={{ padding: "1rem" }}>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {commissionHistory.map((t) => (
                            <tr key={t.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                              <td style={{ padding: "1rem", fontWeight: 700 }}>{t.booking?.booking_code || "N/A"}</td>
                              <td style={{ padding: "1rem" }}>{t.booking?.user?.name || "N/A"}</td>
                              <td style={{ padding: "1rem" }}>{t.booking?.artist?.user?.name || "N/A"}</td>
                              <td style={{ padding: "1rem", fontWeight: 600 }}>₹{t.booking?.final_amount || 0}</td>
                              <td style={{ padding: "1rem", fontWeight: 700, color: "var(--success-color)" }}>₹{t.amount || 0}</td>
                              <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>TXN-{t.id}</td>
                              <td style={{ padding: "1rem" }}>
                                <span className={`badge badge-${t.status === "SUCCESS" ? "success" : t.status === "PENDING" ? "warning" : "danger"}`}>
                                  {t.status}
                                </span>
                              </td>
                              <td style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                                {formatAdminDateTime(t.created_at || t.createdAt || t)}
                              </td>
                              <td style={{ padding: "1rem" }}>
                                <button
                                  className="btn btn-secondary"
                                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                                  onClick={async () => {
                                    try {
                                      const detailsRes = await adminService.getWalletTransactionDetails(t.id);
                                      setSelectedWalletTx(detailsRes.data);
                                    } catch (err) {
                                      showToast("Failed to load details: " + err.message, "danger");
                                    }
                                  }}
                                >
                                  View Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      {walletTotalPages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "2rem" }}>
                          <button
                            className="btn btn-secondary"
                            disabled={walletPage === 1}
                            onClick={() => setWalletPage(walletPage - 1)}
                          >
                            Prev
                          </button>
                          <span style={{ display: "flex", alignItems: "center", paddingHorizontal: "1rem", fontWeight: 600 }}>
                            Page {walletPage} of {walletTotalPages}
                          </span>
                          <button
                            className="btn btn-secondary"
                            disabled={walletPage === walletTotalPages}
                            onClick={() => setWalletPage(walletPage + 1)}
                          >
                            Next
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Detailed Transaction View Modal */}
                {selectedWalletTx && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.6)",
                      zIndex: 2000,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1rem"
                    }}
                  >
                    <div className="glass-panel" style={{ width: "100%", maxWidth: "600px", padding: "2rem", background: "var(--bg-secondary)", borderRadius: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                        <h2 style={{ fontSize: "1.5rem", fontWeight: 800 }}>Transaction Breakdown</h2>
                        <button
                          onClick={() => setSelectedWalletTx(null)}
                          style={{ background: "none", border: "none", fontSize: "1.5rem", cursor: "pointer", color: "var(--text-primary)" }}
                        >
                          &times;
                        </button>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: "1.2rem" }}>

                        {/* Summary Header */}
                        <div style={{ textAlign: "center", padding: "1rem", background: "rgba(108, 92, 231, 0.05)", borderRadius: "12px", border: "1px solid var(--border-color)" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Commission Earned</span>
                          <h1 style={{ fontSize: "2.2rem", fontWeight: 800, color: "var(--success-color)", marginTop: "0.25rem" }}>₹{selectedWalletTx.amount}</h1>
                          <div style={{ display: "inline-block", padding: "0.25rem 0.75rem", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 700, backgroundColor: "var(--success-color)", color: "#fff", marginTop: "0.5rem" }}>
                            {selectedWalletTx.status}
                          </div>
                        </div>

                        {/* Details Sections */}
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.9rem" }}>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Transaction Reference</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>TXN-{selectedWalletTx.id}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Booking Code</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedWalletTx.booking?.booking_code || "N/A"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Customer Name</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedWalletTx.booking?.user?.name || "N/A"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Artist Name</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedWalletTx.booking?.artist?.user?.name || "N/A"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Service Type</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedWalletTx.booking?.service?.specialization_name || "N/A"}</div>
                          </div>
                          <div>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Total Booking Value</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>₹{selectedWalletTx.booking?.final_amount || 0}</div>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Booking Address</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>{selectedWalletTx.booking?.address || "N/A"}</div>
                          </div>
                          <div style={{ gridColumn: "span 2" }}>
                            <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase" }}>Creation Date & Time</span>
                            <div style={{ fontWeight: 600, marginTop: "2px" }}>{formatAdminDateTime(selectedWalletTx.created_at || selectedWalletTx.createdAt || selectedWalletTx)}</div>
                          </div>
                        </div>

                        {/* Description Box */}
                        <div style={{ padding: "0.75rem", backgroundColor: "var(--bg-primary)", borderRadius: "8px", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                          <strong>Description: </strong>{selectedWalletTx.description}
                        </div>

                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Support Tickets & Queries Tab */}
            {activeTab === "tickets" && (
              <div>
                {/* Header & Refresh */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
                  <div>
                    <h2 style={{ fontSize: "1.75rem", fontWeight: 800, margin: 0 }}>Support Desk & User Queries</h2>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.3rem", fontSize: "0.9rem" }}>
                      Monitor and respond to customer & artist queries, issues, and dispute tickets in real-time.
                    </p>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => fetchTickets()}
                    disabled={ticketLoading}
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
                  >
                    <RefreshCw style={{ width: "16px", animation: ticketLoading ? "spin 1s linear infinite" : "none" }} />
                    Refresh Tickets
                  </button>
                </div>

                {/* 5 Top Summary Stat Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
                  {/* Total Queries */}
                  <div className="glass-panel" style={{ padding: "1.2rem", borderRadius: "12px", borderLeft: "4px solid #6c5ce7" }}>
                    <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", fontWeight: 600 }}>Total Queries</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, marginTop: "0.3rem" }}>{ticketStats.total}</div>
                  </div>

                  {/* Raised by Artists */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: "1.2rem",
                      borderRadius: "12px",
                      borderLeft: "4px solid #e84393",
                      background: ticketFilterRole === "ARTIST" ? "rgba(232, 67, 147, 0.08)" : undefined,
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      const next = ticketFilterRole === "ARTIST" ? "ALL" : "ARTIST";
                      setTicketFilterRole(next);
                      fetchTickets(next);
                    }}
                  >
                    <div style={{ color: "#e84393", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>🎨 Artist Queries</span>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#e84393", marginTop: "0.3rem" }}>{ticketStats.from_artists}</div>
                  </div>

                  {/* Raised by Customers */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: "1.2rem",
                      borderRadius: "12px",
                      borderLeft: "4px solid #0984e3",
                      background: ticketFilterRole === "CUSTOMER" ? "rgba(9, 132, 227, 0.08)" : undefined,
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      const next = ticketFilterRole === "CUSTOMER" ? "ALL" : "CUSTOMER";
                      setTicketFilterRole(next);
                      fetchTickets(next);
                    }}
                  >
                    <div style={{ color: "#0984e3", fontSize: "0.8rem", fontWeight: 700, display: "flex", alignItems: "center", gap: "4px" }}>
                      <span>👤 User Queries</span>
                    </div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0984e3", marginTop: "0.3rem" }}>{ticketStats.from_customers}</div>
                  </div>

                  {/* Open Tickets */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: "1.2rem",
                      borderRadius: "12px",
                      borderLeft: "4px solid #fdcb6e",
                      background: ticketFilterStatus === "OPEN" ? "rgba(253, 203, 110, 0.08)" : undefined,
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      const next = ticketFilterStatus === "OPEN" ? "ALL" : "OPEN";
                      setTicketFilterStatus(next);
                      fetchTickets(undefined, next);
                    }}
                  >
                    <div style={{ color: "#e17055", fontSize: "0.8rem", fontWeight: 700 }}>🟡 Pending / Open</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#e17055", marginTop: "0.3rem" }}>{ticketStats.open}</div>
                  </div>

                  {/* Resolved */}
                  <div
                    className="glass-panel"
                    style={{
                      padding: "1.2rem",
                      borderRadius: "12px",
                      borderLeft: "4px solid #00b894",
                      background: ticketFilterStatus === "RESOLVED" ? "rgba(0, 184, 148, 0.08)" : undefined,
                      cursor: "pointer"
                    }}
                    onClick={() => {
                      const next = ticketFilterStatus === "RESOLVED" ? "ALL" : "RESOLVED";
                      setTicketFilterStatus(next);
                      fetchTickets(undefined, next);
                    }}
                  >
                    <div style={{ color: "#00b894", fontSize: "0.8rem", fontWeight: 700 }}>🟢 Resolved / Closed</div>
                    <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#00b894", marginTop: "0.3rem" }}>{ticketStats.resolved}</div>
                  </div>
                </div>

                {/* Filters & Search Toolbar */}
                <div className="glass-panel" style={{ padding: "1.2rem", marginBottom: "1.5rem", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                  <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: "1rem", alignItems: "center" }}>
                    
                    {/* Role Filter Pills */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, alignSelf: "center", marginRight: "0.5rem", color: "var(--text-secondary)" }}>Sender:</span>
                      <button
                        type="button"
                        className={`btn ${ticketFilterRole === "ALL" ? "btn-primary" : "btn-secondary"}`}
                        style={{ padding: "0.4rem 0.9rem", fontSize: "0.85rem", borderRadius: "20px" }}
                        onClick={() => { setTicketFilterRole("ALL"); fetchTickets("ALL"); }}
                      >
                        All ({ticketStats.total})
                      </button>
                      <button
                        type="button"
                        className={`btn ${ticketFilterRole === "ARTIST" ? "btn-primary" : "btn-secondary"}`}
                        style={{
                          padding: "0.4rem 0.9rem",
                          fontSize: "0.85rem",
                          borderRadius: "20px",
                          background: ticketFilterRole === "ARTIST" ? "#e84393" : undefined,
                          borderColor: ticketFilterRole === "ARTIST" ? "#e84393" : undefined
                        }}
                        onClick={() => { setTicketFilterRole("ARTIST"); fetchTickets("ARTIST"); }}
                      >
                        🎨 Artist Queries ({ticketStats.from_artists})
                      </button>
                      <button
                        type="button"
                        className={`btn ${ticketFilterRole === "CUSTOMER" ? "btn-primary" : "btn-secondary"}`}
                        style={{
                          padding: "0.4rem 0.9rem",
                          fontSize: "0.85rem",
                          borderRadius: "20px",
                          background: ticketFilterRole === "CUSTOMER" ? "#0984e3" : undefined,
                          borderColor: ticketFilterRole === "CUSTOMER" ? "#0984e3" : undefined
                        }}
                        onClick={() => { setTicketFilterRole("CUSTOMER"); fetchTickets("CUSTOMER"); }}
                      >
                        👤 Customer Queries ({ticketStats.from_customers})
                      </button>
                    </div>

                    {/* Status Filter Pills */}
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, alignSelf: "center", marginRight: "0.5rem", color: "var(--text-secondary)" }}>Status:</span>
                      {["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map(st => (
                        <button
                          key={st}
                          type="button"
                          className={`btn ${ticketFilterStatus === st ? "btn-primary" : "btn-secondary"}`}
                          style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", borderRadius: "15px" }}
                          onClick={() => { setTicketFilterStatus(st); fetchTickets(undefined, st); }}
                        >
                          {st === "ALL" ? "All" : st.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Search Bar */}
                  <form
                    onSubmit={(e) => { e.preventDefault(); fetchTickets(); }}
                    style={{ display: "flex", gap: "0.5rem" }}
                  >
                    <div style={{ position: "relative", flexGrow: 1 }}>
                      <Search style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "16px", color: "var(--text-secondary)" }} />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Search by ticket ID, sender name, phone number, subject, booking code..."
                        value={ticketSearch}
                        onChange={(e) => setTicketSearch(e.target.value)}
                        style={{ paddingLeft: "38px" }}
                      />
                    </div>
                    <button type="submit" className="btn btn-primary" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      Search
                    </button>
                    {ticketSearch && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => { setTicketSearch(""); fetchTickets(undefined, undefined, ""); }}
                      >
                        Clear
                      </button>
                    )}
                  </form>
                </div>

                {/* Tickets Table / List */}
                {ticketLoading ? (
                  <div style={{ textAlign: "center", padding: "3rem" }}>
                    <div className="spinner" style={{ margin: "0 auto 1rem" }} />
                    <p style={{ color: "var(--text-secondary)" }}>Loading support queries...</p>
                  </div>
                ) : tickets.length === 0 ? (
                  <div className="glass-panel" style={{ textAlign: "center", padding: "3rem", borderRadius: "12px" }}>
                    <HelpCircle style={{ width: "48px", height: "48px", color: "var(--text-secondary)", margin: "0 auto 1rem", opacity: 0.5 }} />
                    <h3 style={{ fontSize: "1.2rem", fontWeight: 700 }}>No Support Queries Found</h3>
                    <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem", fontSize: "0.9rem" }}>
                      {ticketSearch || ticketFilterRole !== "ALL" || ticketFilterStatus !== "ALL"
                        ? "No support tickets match the current filter or search criteria."
                        : "There are currently no support tickets or queries raised."}
                    </p>
                  </div>
                ) : (
                  <div className="glass-panel" style={{ padding: "1.5rem", borderRadius: "12px", overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.9rem" }}>
                      <thead>
                        <tr style={{ borderBottom: "2px solid var(--border-color)", color: "var(--text-secondary)" }}>
                          <th style={{ padding: "0.75rem" }}>Ticket ID</th>
                          <th style={{ padding: "0.75rem" }}>Sender (Role)</th>
                          <th style={{ padding: "0.75rem" }}>Contact</th>
                          <th style={{ padding: "0.75rem" }}>Subject & Category</th>
                          <th style={{ padding: "0.75rem" }}>Booking Ref</th>
                          <th style={{ padding: "0.75rem", textAlign: "center" }}>Priority</th>
                          <th style={{ padding: "0.75rem" }}>Status</th>
                          <th style={{ padding: "0.75rem" }}>Date</th>
                          <th style={{ padding: "0.75rem", textAlign: "center" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tickets.map((t) => {
                          const isArtist = t.sender_role === "ARTIST" || t.user_type === "ARTIST";
                          const statusColor =
                            t.status === "OPEN"
                              ? "#e17055"
                              : t.status === "IN_PROGRESS"
                              ? "#0984e3"
                              : t.status === "RESOLVED"
                              ? "#00b894"
                              : "#636e72";

                          return (
                            <tr
                              key={t.id}
                              style={{
                                borderBottom: "1px solid var(--border-color)",
                                transition: "background 0.2s"
                              }}
                            >
                              {/* Ticket ID */}
                              <td style={{ padding: "0.75rem", fontWeight: 700 }}>
                                #{t.id}
                              </td>

                              {/* Sender & Role Badge */}
                              <td style={{ padding: "0.75rem" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                  {/* Avatar or fallback */}
                                  <div
                                    style={{
                                      width: "34px",
                                      height: "34px",
                                      borderRadius: "50%",
                                      background: isArtist ? "rgba(232, 67, 147, 0.15)" : "rgba(9, 132, 227, 0.15)",
                                      color: isArtist ? "#e84393" : "#0984e3",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontWeight: 800,
                                      fontSize: "0.85rem",
                                      flexShrink: 0
                                    }}
                                  >
                                    {t.user_name ? t.user_name.charAt(0).toUpperCase() : "U"}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{t.user_name}</div>
                                    {/* Clear Distinct Role Tag */}
                                    <span
                                      style={{
                                        display: "inline-block",
                                        marginTop: "2px",
                                        padding: "2px 8px",
                                        borderRadius: "10px",
                                        fontSize: "0.7rem",
                                        fontWeight: 800,
                                        letterSpacing: "0.5px",
                                        background: isArtist ? "#e84393" : "#0984e3",
                                        color: "#ffffff"
                                      }}
                                    >
                                      {isArtist ? "🎨 ARTIST" : "👤 CUSTOMER"}
                                    </span>
                                  </div>
                                </div>
                              </td>

                              {/* Contact */}
                              <td style={{ padding: "0.75rem", fontSize: "0.85rem" }}>
                                <div>📞 {t.user_phone || "N/A"}</div>
                                {t.user_email && <div style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>✉️ {t.user_email}</div>}
                              </td>

                              {/* Subject & Category */}
                              <td style={{ padding: "0.75rem", maxWidth: "260px" }}>
                                <div style={{ fontWeight: 700 }}>{t.subject}</div>
                                <div style={{ display: "flex", gap: "4px", marginTop: "2px" }}>
                                  <span style={{ fontSize: "0.7rem", background: "rgba(108, 92, 231, 0.1)", color: "var(--primary-color)", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                    {t.category}
                                  </span>
                                  {Array.isArray(t.replies) && t.replies.length > 0 && (
                                    <span style={{ fontSize: "0.7rem", background: "rgba(0, 184, 148, 0.1)", color: "#00b894", padding: "1px 6px", borderRadius: "4px", fontWeight: 600 }}>
                                      💬 {t.replies.length} replies
                                    </span>
                                  )}
                                </div>
                                <div style={{ color: "var(--text-secondary)", fontSize: "0.8rem", marginTop: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                  {t.description}
                                </div>
                              </td>

                              {/* Booking Ref */}
                              <td style={{ padding: "0.75rem", fontSize: "0.85rem" }}>
                                {t.booking_id ? (
                                  <div>
                                    <span style={{ fontWeight: 700, color: "var(--primary-color)" }}>
                                      {t.booking_code || `#${t.booking_id}`}
                                    </span>
                                    {t.booking_status && (
                                      <div style={{ fontSize: "0.7rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>
                                        {t.booking_status}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: "var(--text-secondary)" }}>-</span>
                                )}
                              </td>

                              {/* Priority */}
                              <td style={{ padding: "0.75rem", textAlign: "center" }}>
                                <span
                                  style={{
                                    padding: "3px 8px",
                                    borderRadius: "8px",
                                    fontSize: "0.75rem",
                                    fontWeight: 700,
                                    background: (t.priority === "HIGH" ? "rgba(239, 68, 68, 0.15)" : (t.priority === "MEDIUM" ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)")),
                                    color: (t.priority === "HIGH" ? "#EF4444" : (t.priority === "MEDIUM" ? "#F59E0B" : "#10B981")),
                                    border: `1px solid ${t.priority === "HIGH" ? "rgba(239, 68, 68, 0.3)" : (t.priority === "MEDIUM" ? "rgba(245, 158, 11, 0.3)" : "rgba(16, 185, 129, 0.3)")}`
                                  }}
                                >
                                  {t.priority || "MEDIUM"}
                                </span>
                              </td>

                              {/* Status Dropdown */}
                              <td style={{ padding: "0.75rem" }}>
                                <select
                                  value={t.status}
                                  onChange={(e) => handleUpdateTicketStatus(t.id, e.target.value)}
                                  style={{
                                    padding: "0.3rem 0.6rem",
                                    borderRadius: "12px",
                                    border: `1px solid ${statusColor}`,
                                    color: statusColor,
                                    fontWeight: 700,
                                    fontSize: "0.75rem",
                                    background: "transparent",
                                    cursor: "pointer"
                                  }}
                                >
                                  <option value="OPEN">🟡 OPEN</option>
                                  <option value="IN_PROGRESS">🔵 IN PROGRESS</option>
                                  <option value="WAITING_FOR_USER">🟣 WAITING FOR USER</option>
                                  <option value="RESOLVED">🟢 RESOLVED</option>
                                  <option value="CLOSED">⚫ CLOSED</option>
                                </select>
                              </td>

                              {/* Date */}
                              <td style={{ padding: "0.75rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                                {formatAdminDate(t.created_at || t.createdAt || t)}
                                <div style={{ fontSize: "0.7rem" }}>{formatAdminTime(t.created_at || t.createdAt || t)}</div>
                              </td>

                              {/* Action */}
                              <td style={{ padding: "0.75rem", textAlign: "center" }}>
                                <button
                                  className="btn btn-primary"
                                  style={{ padding: "0.35rem 0.8rem", fontSize: "0.8rem", borderRadius: "8px" }}
                                  onClick={() => setSelectedTicket(t)}
                                >
                                  View & Reply
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Ticket Details & Reply Modal */}
                {selectedTicket && (
                  <div
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      background: "rgba(0,0,0,0.65)",
                      zIndex: 2000,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "1rem"
                    }}
                  >
                    <div
                      className="glass-panel"
                      style={{
                        width: "100%",
                        maxWidth: "750px",
                        maxHeight: "90vh",
                        overflowY: "auto",
                        padding: "2rem",
                        background: "var(--bg-secondary)",
                        borderRadius: "16px",
                        position: "relative"
                      }}
                    >
                      {/* Modal Header */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.5rem", borderBottom: "1px solid var(--border-color)", paddingBottom: "1rem" }}>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "1.4rem", fontWeight: 800 }}>
                              Ticket #{selectedTicket.id}: {selectedTicket.subject}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                            {/* Role Badge */}
                            <span
                              style={{
                                padding: "3px 10px",
                                borderRadius: "12px",
                                fontSize: "0.75rem",
                                fontWeight: 800,
                                background: selectedTicket.sender_role === "ARTIST" ? "#e84393" : "#0984e3",
                                color: "#fff"
                              }}
                            >
                              {selectedTicket.sender_role === "ARTIST" ? "🎨 ARTIST QUERY" : "👤 CUSTOMER QUERY"}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              Category: <strong>{selectedTicket.category}</strong>
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                              Date: <strong>{formatAdminDateTime(selectedTicket.created_at || selectedTicket.createdAt || selectedTicket)}</strong>
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedTicket(null)}
                          style={{ background: "none", border: "none", fontSize: "1.8rem", cursor: "pointer", color: "var(--text-primary)" }}
                        >
                          &times;
                        </button>
                      </div>

                      {/* Sender & Booking Info Strip */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", background: "var(--bg-primary)", padding: "1rem", borderRadius: "10px", marginBottom: "1.5rem", fontSize: "0.85rem" }}>
                        <div>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Sender Details</span>
                          <div style={{ fontWeight: 700, marginTop: "2px" }}>{selectedTicket.user_name}</div>
                          <div>📞 {selectedTicket.user_phone}</div>
                          {selectedTicket.user_email && <div>✉️ {selectedTicket.user_email}</div>}
                        </div>
                        <div>
                          <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", textTransform: "uppercase", fontWeight: 700 }}>Booking Details</span>
                          {selectedTicket.booking_id ? (
                            <>
                              <div style={{ fontWeight: 700, color: "var(--primary-color)", marginTop: "2px" }}>
                                {selectedTicket.booking_code || `#${selectedTicket.booking_id}`}
                              </div>
                              {selectedTicket.booking_status && <div>Status: <strong>{selectedTicket.booking_status}</strong></div>}
                              {selectedTicket.booking_amount && <div>Amount: ₹{selectedTicket.booking_amount}</div>}
                            </>
                          ) : (
                            <div style={{ color: "var(--text-secondary)", marginTop: "2px" }}>No linked booking</div>
                          )}
                        </div>
                      </div>

                      {/* Original Query Message */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--text-primary)" }}>
                          Initial Query Message:
                        </h4>
                        <div style={{ background: "var(--bg-primary)", padding: "1rem", borderRadius: "10px", borderLeft: "4px solid var(--primary-color)", fontSize: "0.9rem", lineHeight: "1.5" }}>
                          {selectedTicket.description}
                        </div>
                      </div>

                      {/* Attachments Preview (if any) */}
                      {selectedTicket.attachments && (
                        <div style={{ marginBottom: "1.5rem" }}>
                          <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>Attachments:</h4>
                          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                            {(Array.isArray(selectedTicket.attachments) ? selectedTicket.attachments : [selectedTicket.attachments]).map((att, idx) => {
                              const uri = typeof att === "string" ? att : att?.url || att?.uri;
                              if (!uri) return null;
                              return (
                                <img
                                  key={idx}
                                  src={uri}
                                  alt="Attachment"
                                  style={{ width: "100px", height: "100px", objectFit: "cover", borderRadius: "8px", cursor: "pointer", border: "1px solid var(--border-color)" }}
                                  onClick={() => setViewDoc(uri)}
                                />
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Conversation Thread / Replies */}
                      <div style={{ marginBottom: "1.5rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.8rem" }}>
                          Conversation History ({Array.isArray(selectedTicket.replies) ? selectedTicket.replies.length : 0}):
                        </h4>
                        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxHeight: "250px", overflowY: "auto", paddingRight: "0.5rem" }}>
                          {Array.isArray(selectedTicket.replies) && selectedTicket.replies.length > 0 ? (
                            selectedTicket.replies.map((r, rIdx) => {
                              const isAdmin = r.sender === "ADMIN" || r.sender_role === "ADMIN";
                              return (
                                <div
                                  key={rIdx}
                                  style={{
                                    alignSelf: isAdmin ? "flex-end" : "flex-start",
                                    maxWidth: "80%",
                                    background: isAdmin ? "rgba(108, 92, 231, 0.15)" : "var(--bg-primary)",
                                    border: isAdmin ? "1px solid rgba(108, 92, 231, 0.3)" : "1px solid var(--border-color)",
                                    padding: "0.75rem 1rem",
                                    borderRadius: "10px"
                                  }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.25rem", fontSize: "0.75rem" }}>
                                    <strong style={{ color: isAdmin ? "var(--primary-color)" : "var(--text-primary)" }}>
                                      {r.sender_name || (isAdmin ? "Admin Desk" : selectedTicket.user_name)}
                                    </strong>
                                    <span style={{ color: "var(--text-secondary)" }}>
                                      {formatAdminTime(r.created_at || r.createdAt || r)}
                                    </span>
                                  </div>
                                  <div style={{ fontSize: "0.85rem", lineHeight: "1.4" }}>{r.message}</div>
                                </div>
                              );
                            })
                          ) : (
                            <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem", padding: "1rem", background: "var(--bg-primary)", borderRadius: "8px" }}>
                              No replies in this ticket yet. Reply below to update the user.
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reply Form */}
                      <form onSubmit={handleSendTicketReply} style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1.2rem" }}>
                        <h4 style={{ fontSize: "0.95rem", fontWeight: 700, marginBottom: "0.5rem" }}>
                          Send Admin Response:
                        </h4>

                        <div className="form-group" style={{ marginBottom: "1rem" }}>
                          <textarea
                            className="form-control"
                            rows="3"
                            placeholder="Type your response to the user / artist here..."
                            value={ticketReplyText}
                            onChange={(e) => setTicketReplyText(e.target.value)}
                            required
                          />
                        </div>

                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem" }}>
                            <span style={{ fontWeight: 600 }}>Set Status:</span>
                            <select
                              value={ticketReplyStatus}
                              onChange={(e) => setTicketReplyStatus(e.target.value)}
                              className="form-control"
                              style={{ width: "auto", padding: "0.3rem 0.6rem" }}
                            >
                              <option value="IN_PROGRESS">🔵 IN PROGRESS</option>
                              <option value="RESOLVED">🟢 RESOLVED</option>
                              <option value="CLOSED">⚫ CLOSED</option>
                              <option value="OPEN">🟡 KEEP OPEN</option>
                            </select>
                          </div>

                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              onClick={() => setSelectedTicket(null)}
                            >
                              Close
                            </button>
                            <button
                              type="submit"
                              className="btn btn-primary"
                              disabled={isSendingTicketReply || !ticketReplyText.trim()}
                              style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
                            >
                              <Send style={{ width: "16px" }} />
                              {isSendingTicketReply ? "Sending..." : "Send Response"}
                            </button>
                          </div>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Document Viewer Modal */}
        {viewDoc && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.8)",
              zIndex: 2000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "2rem",
            }}
          >
            <div style={{ position: "relative", maxWidth: "90%", maxHeight: "90%" }}>
              <button
                onClick={() => setViewDoc(null)}
                style={{
                  position: "absolute",
                  top: "-2.5rem",
                  right: 0,
                  background: "none",
                  border: "none",
                  color: "#fff",
                  fontSize: "2rem",
                  cursor: "pointer",
                }}
              >
                &times;
              </button>
              <img
                src={viewDoc}
                alt="Audit document upload"
                style={{ maxWidth: "100%", maxHeight: "80vh", borderRadius: "8px", objectFit: "contain", background: "var(--bg-secondary)" }}
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1557804506-669a67965ba0?q=80&w=400"; // fallback
                  showToast("Image not available, showing fallback placeholder", "warning");
                }}
              />
            </div>
          </div>
        )}

        {/* Reject Dialog Prompt */}
        {rejectId && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0,0,0,0.6)",
              zIndex: 1500,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div className="glass-panel" style={{ width: "100%", maxWidth: "400px", padding: "2rem", background: "var(--bg-secondary)" }}>
              <h3 style={{ marginBottom: "1rem" }}>Reason for Rejection</h3>
              <form onSubmit={handleRejectSubmit}>
                <div className="form-group">
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Enter document mismatch details or reason for rejection..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
                  <button type="submit" className="btn btn-danger" style={{ flexGrow: 1, justifyContent: "center" }}>
                    Submit Rejection
                  </button>
                  <button type="button" className="btn btn-secondary" onClick={() => setRejectId(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
