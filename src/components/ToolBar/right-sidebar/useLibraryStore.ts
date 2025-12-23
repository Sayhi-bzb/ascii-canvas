import { create } from "zustand";

export interface LibraryData {
  entities: Record<string, Record<string, string>>;
  related: Record<string, string[]>;
  alphabets: Record<string, string[]>;
  lists: Record<string, string[]>;
  nerdfonts: Record<string, string[]>;
}

interface LibraryState {
  data: LibraryData | null;
  isLoading: boolean;
  error: string | null;
  searchQuery: string;
  searchResults: string[];
  fetchLibrary: () => Promise<void>;
  setSearchQuery: (query: string) => void;
}

export const useLibraryStore = create<LibraryState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  searchQuery: "",
  searchResults: [],

  fetchLibrary: async () => {
    // 检查仓库是否已有物资，避免重复进货
    if (get().data) return;

    set({ isLoading: true, error: null });
    try {
      // 统一物流链路，确保所有 JSON 资源同步到达
      const files = ["entities", "related", "alphabets", "lists", "nerdfonts"];
      const [entities, related, alphabets, lists, nerdfonts] =
        await Promise.all(
          files.map((f) => fetch(`/data/${f}.json`).then((res) => res.json()))
        );

      set({
        data: { entities, related, alphabets, lists, nerdfonts },
        isLoading: false,
      });
    } catch (err) {
      set({ error: "Failed to load logistics data", isLoading: false });
      console.error("Library fetch error:", err);
    }
  },

  setSearchQuery: (query: string) => {
    const { data } = get();
    if (!data || !query.trim()) {
      set({ searchQuery: query, searchResults: [] });
      return;
    }

    const lowerQuery = query.toLowerCase();
    const results = new Set<string>();

    // 全城搜索分拣逻辑
    Object.values(data.entities).forEach((category) => {
      Object.entries(category).forEach(([name, char]) => {
        if (name.toLowerCase().includes(lowerQuery)) results.add(char);
      });
    });

    // 字符关联联想
    if (query.length === 1 && data.related[query]) {
      data.related[query].forEach((char) => results.add(char));
    }

    set({
      searchQuery: query,
      searchResults: Array.from(results).slice(0, 100),
    });
  },
}));
