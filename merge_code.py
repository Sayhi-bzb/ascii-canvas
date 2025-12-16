#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
代码合并脚本 (TUI风格 GUI版) - V1.2
新增：文本批量导入功能、缺失文件检测
"""

import os
import re
import tkinter as tk
from tkinter import filedialog, messagebox

# === 尝试导入拖拽库 ===
try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    HAS_DND = True
except ImportError:
    HAS_DND = False
    print("提示: 未安装 tkinterdnd2")

# ==================== 配置常量 ====================
STYLE_BG = "#FFFFFF"       # 背景白
STYLE_FG = "#000000"       # 前景黑
STYLE_FONT = ("Consolas", 10)      # 等宽字体
STYLE_BORDER_WIDTH = 1     # 1px 边框
STYLE_RELIEF = "solid"     # 实线边框

# ==================== 核心逻辑 ====================
def is_text_file(file_path):
    text_extensions = {
        '.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.yml', '.yaml',
        '.css', '.scss', '.less', '.html', '.xml', '.py', '.java', '.c', '.cpp',
        '.h', '.hpp', '.sh', '.bat', '.ps1', '.mjs', '.spec.ts', '.test.ts'
    }
    _, ext = os.path.splitext(file_path)
    return ext.lower() in text_extensions

def read_file_content(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except UnicodeDecodeError:
        try:
            with open(file_path, 'r', encoding='latin-1') as f:
                return f.read()
        except Exception as e:
            return f"Error reading file: {str(e)}"
    except Exception as e:
        return f"Error reading file: {str(e)}"

def process_target(target_full_path, base_path):
    files_data = []
    # 如果路径不存在，直接返回空，不报错（报错逻辑前置到UI层）
    if not os.path.exists(target_full_path):
        return files_data
        
    if os.path.isfile(target_full_path):
        if is_text_file(target_full_path):
            try:
                rel_path = os.path.relpath(target_full_path, base_path)
            except ValueError:
                rel_path = os.path.basename(target_full_path)
            content = read_file_content(target_full_path)
            files_data.append({"path": rel_path.replace('\\', '/'), "content": content})
            
    elif os.path.isdir(target_full_path):
        for root, dirs, files in os.walk(target_full_path):
            for file in files:
                file_path = os.path.join(root, file)
                if is_text_file(file_path):
                    try:
                        rel_path = os.path.relpath(file_path, base_path)
                    except ValueError:
                        rel_path = os.path.join(os.path.basename(target_full_path), file)
                    content = read_file_content(file_path)
                    files_data.append({"path": rel_path.replace('\\', '/'), "content": content})
    return files_data

def write_json_without_escaping_newlines(data, file_path):
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write('[\n')
        for i, item in enumerate(data):
            f.write('  {\n')
            f.write(f'    "path": "{item["path"]}",\n')
            f.write('    "content": "')
            content = item["content"].replace('\\', '\\\\').replace('"', '\\"')
            f.write(content)
            f.write('"\n')
            f.write('  }')
            if i < len(data) - 1:
                f.write(',')
            f.write('\n')
        f.write(']\n')

# ==================== 自定义 TUI 组件 ====================

class TUIButton(tk.Button):
    """自定义复古按钮：黑白反色交互"""
    def __init__(self, master, text, command, **kwargs):
        font = kwargs.pop('font', STYLE_FONT)
        super().__init__(
            master, 
            text=f"[{text}]", 
            command=command,
            font=font,
            bg=STYLE_BG,
            fg=STYLE_FG,
            activebackground=STYLE_FG,
            activeforeground=STYLE_BG,
            relief=STYLE_RELIEF,
            bd=STYLE_BORDER_WIDTH,
            cursor="hand2",
            padx=10,
            pady=5,
            **kwargs
        )
        self.bind("<Enter>", self.on_enter)
        self.bind("<Leave>", self.on_leave)

    def on_enter(self, event):
        self.config(bg=STYLE_FG, fg=STYLE_BG)

    def on_leave(self, event):
        self.config(bg=STYLE_BG, fg=STYLE_FG)

class TUILabel(tk.Label):
    """自定义复古标签"""
    def __init__(self, master, text, **kwargs):
        font = kwargs.pop('font', STYLE_FONT)
        super().__init__(
            master,
            text=text,
            font=font,
            bg=STYLE_BG,
            fg=STYLE_FG,
            **kwargs
        )

class TextInputDialog(tk.Toplevel):
    """自定义文本输入弹窗"""
    def __init__(self, parent, callback):
        super().__init__(parent)
        self.callback = callback
        self.title("BATCH_IMPORT")
        self.geometry("600x400")
        self.configure(bg=STYLE_BG)
        
        # 居中显示
        x = parent.winfo_x() + 50
        y = parent.winfo_y() + 50
        self.geometry(f"+{x}+{y}")

        # 提示
        tk.Label(self, text="PASTE_PATHS_BELOW (ONE_PER_LINE):", 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, anchor="w").pack(fill=tk.X, padx=10, pady=10)

        # 文本框容器（画边框）
        container = tk.Frame(self, bg=STYLE_FG, bd=1)
        container.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))
        
        self.text_area = tk.Text(container, bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, 
                                 relief="flat", bd=0, insertbackground=STYLE_FG)
        self.text_area.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)
        self.text_area.focus_set()

        # 底部按钮
        btn_frame = tk.Frame(self, bg=STYLE_BG, pady=10)
        btn_frame.pack(fill=tk.X, padx=10)
        
        TUIButton(btn_frame, "CONFIRM_IMPORT", self.on_confirm).pack(side=tk.RIGHT)
        TUIButton(btn_frame, "CANCEL", self.destroy).pack(side=tk.RIGHT, padx=10)

    def on_confirm(self):
        content = self.text_area.get("1.0", tk.END)
        self.callback(content)
        self.destroy()

# ==================== 主程序 ====================

class TuiMergerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("CODE_MERGER_V1.2")
        self.root.geometry("800x600")
        self.root.configure(bg=STYLE_BG) 
        
        self.base_path = os.path.dirname(os.path.abspath(__file__))
        self.target_list = [] # 存储完整绝对路径

        self.setup_ui()

    def setup_ui(self):
        # 1. Header
        header_frame = tk.Frame(self.root, bg=STYLE_BG, pady=15, padx=15)
        header_frame.pack(fill=tk.X)
        title = TUILabel(header_frame, text="> SYSTEM.CODE_MERGE_TOOL")
        title.config(font=("Consolas", 14, "bold"))
        title.pack(side=tk.LEFT)

        # 2. Toolbar
        toolbar = tk.Frame(self.root, bg=STYLE_BG, pady=5, padx=15)
        toolbar.pack(fill=tk.X)

        # 按钮布局
        TUIButton(toolbar, "ADD_FILES", self.add_files).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar, "ADD_FOLDER", self.add_folder).pack(side=tk.LEFT, padx=(0, 10))
        # 新增：文本导入按钮
        TUIButton(toolbar, "IMPORT_TEXT", self.open_text_import).pack(side=tk.LEFT, padx=(0, 10))
        
        TUIButton(toolbar, "REMOVE_SEL", self.remove_selected).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar, "CLEAR_ALL", self.clear_all).pack(side=tk.LEFT, padx=(0, 10))

        # 3. List Area
        list_container = tk.Frame(self.root, bg=STYLE_FG, bd=1)
        list_container.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)
        
        inner_frame = tk.Frame(list_container, bg=STYLE_BG)
        inner_frame.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        # Status Line
        status_text = "STATUS: WAITING... (PASTE_PATHS_OR_DRAG_DROP)"
        self.status_label = TUILabel(inner_frame, text=status_text)
        self.status_label.pack(anchor=tk.W, padx=5, pady=5)
        
        tk.Frame(inner_frame, bg=STYLE_FG, height=1).pack(fill=tk.X)

        # Listbox
        self.listbox = tk.Listbox(
            inner_frame,
            font=STYLE_FONT,
            bg=STYLE_BG,
            fg=STYLE_FG,
            selectbackground=STYLE_FG,
            selectforeground=STYLE_BG,
            activestyle="none",
            bd=0,
            highlightthickness=0,
            relief="flat"
        )
        self.listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)

        scrollbar = tk.Scrollbar(inner_frame, command=self.listbox.yview, relief="solid", bd=1)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.listbox.config(yscrollcommand=scrollbar.set)

        if HAS_DND:
            self.listbox.drop_target_register(DND_FILES)
            self.listbox.dnd_bind('<<Drop>>', self.handle_drop)

        # 4. Footer
        footer = tk.Frame(self.root, bg=STYLE_BG, pady=15, padx=15)
        footer.pack(fill=tk.X)
        
        self.path_var = tk.StringVar(value=f"ROOT: {self.base_path}")
        TUILabel(footer, text=f"ROOT: {self.base_path}", font=("Consolas", 8)).pack(anchor=tk.W, pady=(0,5))

        self.run_btn = TUIButton(footer, "EXECUTE_MERGE -> merged_code.json", self.run_merge)
        self.run_btn.pack(fill=tk.X)

    # === 新增：文本导入逻辑 ===
    def open_text_import(self):
        TextInputDialog(self.root, self.process_text_import)

    def process_text_import(self, text_content):
        """处理粘贴的文本内容"""
        lines = text_content.strip().split('\n')
        added_count = 0
        failed_count = 0
        
        for line in lines:
            line = line.strip()
            # 去除首尾可能的引号
            line = line.strip('"').strip("'")
            if not line:
                continue
            
            # 解析路径
            # 1. 如果是绝对路径，直接用
            # 2. 如果是相对路径，拼接 base_path
            if os.path.isabs(line):
                full_path = os.path.normpath(line)
            else:
                full_path = os.path.normpath(os.path.join(self.base_path, line))
            
            # 添加到列表（无论存在与否，都先加进去，在 refresh_listbox 里做状态展示）
            if full_path not in self.target_list:
                self.target_list.append(full_path)
                added_count += 1
                
        self.refresh_listbox()
        self.status_label.config(text=f"STATUS: IMPORTED_{added_count}_ITEMS")

    # === 原有逻辑更新 ===

    def handle_drop(self, event):
        if not event.data: return
        raw_data = event.data
        pattern = re.compile(r'\{(?P<quoted>.*?)\}|(?P<plain>\S+)')
        
        count = 0
        for match in pattern.finditer(raw_data):
            path = match.group('quoted') or match.group('plain')
            if path:
                full_path = os.path.normpath(path)
                if full_path not in self.target_list:
                    self.target_list.append(full_path)
                    count += 1
        
        self.refresh_listbox()
        self.status_label.config(text=f"STATUS: ADDED_{count}_ITEMS")

    def add_files(self):
        files = filedialog.askopenfilenames(initialdir=self.base_path, title="SELECT_FILES")
        if files:
            for f in files:
                if f not in self.target_list:
                    self.target_list.append(f)
            self.refresh_listbox()

    def add_folder(self):
        folder = filedialog.askdirectory(initialdir=self.base_path, title="SELECT_DIRECTORY")
        if folder:
            if folder not in self.target_list:
                self.target_list.append(folder)
            self.refresh_listbox()

    def remove_selected(self):
        selected_indices = self.listbox.curselection()
        for i in reversed(selected_indices):
            del self.target_list[i]
        self.refresh_listbox()
        self.status_label.config(text="STATUS: ITEM_REMOVED")

    def clear_all(self):
        self.target_list = []
        self.refresh_listbox()
        self.status_label.config(text="STATUS: LIST_CLEARED")

    def refresh_listbox(self):
        """刷新列表显示，包含文件状态检查"""
        self.listbox.delete(0, tk.END)
        
        for path in self.target_list:
            exists = os.path.exists(path)
            
            # 尝试显示相对路径
            try:
                display_path = os.path.relpath(path, self.base_path)
            except ValueError:
                display_path = path
            
            # 状态前缀
            if not exists:
                prefix = "[MISSING]" 
            elif os.path.isdir(path):
                prefix = "[DIR    ]"
            else:
                prefix = "[FILE   ]"
            
            display_text = f"{prefix} {display_path}"
            self.listbox.insert(tk.END, display_text)
            
            # 如果缺失，给这一行加个颜色（TUI风格用 灰色 或 保持文字提示）
            # Listbox 设置单行颜色比较麻烦，这里依靠前缀文本提示

    def run_merge(self):
        if not self.target_list:
            messagebox.showwarning("ERROR", "ERROR: LIST_IS_EMPTY")
            return

        # 检查是否有缺失文件
        valid_targets = [p for p in self.target_list if os.path.exists(p)]
        missing_count = len(self.target_list) - len(valid_targets)
        
        if missing_count > 0:
            if not messagebox.askyesno("WARNING", f"FOUND {missing_count} MISSING FILES.\nCONTINUE MERGING VALID FILES ONLY?"):
                return

        output_file = os.path.join(self.base_path, "merged_code.json")
        result = []
        
        self.status_label.config(text="STATUS: PROCESSING...")
        self.root.update()

        try:
            for target in valid_targets:
                files_data = process_target(target, self.base_path)
                result.extend(files_data)

            unique_result = []
            seen_paths = set()
            for item in result:
                if item['path'] not in seen_paths:
                    unique_result.append(item)
                    seen_paths.add(item['path'])

            write_json_without_escaping_newlines(unique_result, output_file)
            
            self.status_label.config(text="STATUS: SUCCESS")
            messagebox.showinfo("SUCCESS", 
                              f"COMPLETE.\n"
                              f"SCANNED: {len(valid_targets)} TARGETS\n"
                              f"SKIPPED: {missing_count} MISSING\n"
                              f"TOTAL FILES: {len(unique_result)}\n"
                              f"OUTPUT: {output_file}")
            
        except Exception as e:
            self.status_label.config(text="STATUS: ERROR")
            messagebox.showerror("ERROR", f"EXCEPTION: {str(e)}")

def main():
    if HAS_DND:
        root = TkinterDnD.Tk()
    else:
        root = tk.Tk()
        
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass
        
    app = TuiMergerApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()