#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
代码行数分析器 (TUI风格 GUI版) - V2.0
基于 merge_code.py 的设计风格和交互模式
新增：灵活配置、多格式支持、扩展性增强
"""

import os
import sys
import json
import csv
import tkinter as tk
from tkinter import filedialog, messagebox, simpledialog
from pathlib import Path
from typing import Dict, List, Tuple, Set, Optional, Union

# 尝试导入拖拽支持模块
try:
    from tkinterdnd2 import DND_FILES, TkinterDnD
    DRAG_DROP_SUPPORTED = True
except ImportError:
    DRAG_DROP_SUPPORTED = False

# ==================== 配置常量 ====================
STYLE_BG = "#FFFFFF"       # 背景白
STYLE_FG = "#000000"       # 前景黑
STYLE_FONT = ("Consolas", 10)      # 等宽字体
STYLE_BORDER_WIDTH = 1     # 1px 边框
STYLE_RELIEF = "solid"     # 实线边框

# ==================== 核心分析逻辑 ====================

class CodeLinesAnalyzer:
    def __init__(self, config: Dict = None):
        """初始化分析器"""
        default_config = {
            'code_extensions': {
                '.js', '.jsx', '.ts', '.tsx', '.py', '.css', '.scss', '.sass', 
                '.html', '.json', '.md', '.yml', '.yaml', '.xml', '.java', '.cpp', 
                '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', 
                '.scala', '.r', '.m', '.mm', '.sh', '.bat', '.ps1', '.sql'
            },
            'exclude_dirs': {'.git', '__pycache__', 'node_modules', '.vscode', 
                           '.idea', 'dist', 'build', '.next', '.nuxt', 'coverage'},
            'exclude_files': {'.DS_Store', 'Thumbs.db', '*.tmp', '*.log'},
            'custom_extensions': set()
        }
        
        if config:
            default_config.update(config)
        
        self.config = default_config
        
        # 分析结果存储
        self.results: Dict[str, Dict[str, int]] = {}
        self.totals: Dict[str, int] = {}
        self.file_details: List[Dict] = []
        
    def is_code_file(self, file_path: Path) -> bool:
        """检查文件是否为代码文件"""
        # 检查自定义扩展名
        if self.config['custom_extensions']:
            if file_path.suffix.lower() in self.config['custom_extensions']:
                return True
        
        # 检查标准扩展名
        return file_path.suffix.lower() in self.config['code_extensions']
    
    def should_exclude_path(self, path: Path) -> bool:
        """检查路径是否应该被排除"""
        # 检查目录排除列表
        for part in path.parts:
            if part in self.config['exclude_dirs']:
                return True
        
        # 检查文件排除列表
        for pattern in self.config['exclude_files']:
            if pattern.startswith('*.') and path.suffix.lower() == pattern[1:]:
                return True
            if path.name == pattern:
                return True
        
        return False
    
    def count_file_lines(self, file_path: Path) -> int:
        """计算文件行数"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                return sum(1 for _ in f)
        except Exception as e:
            return 0
    
    def count_code_lines(self, file_path: Path) -> Tuple[int, int, int]:
        """计算代码文件的总行数、代码行数、注释行数"""
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            total_lines = len(lines)
            code_lines = 0
            comment_lines = 0
            
            # 常见注释模式
            comment_patterns = [
                r'^\s*//',           # 单行注释
                r'^\s*#',            # Python注释
                r'^\s*\*',           # 多行注释开头
                r'^\s*/\*',          # 多行注释开始
                r'^\s*<!--',         # HTML注释
                r'^\s*--',           # SQL注释
            ]
            
            import re
            patterns = [re.compile(p) for p in comment_patterns]
            
            for line in lines:
                stripped = line.strip()
                if not stripped:
                    continue
                
                # 检查是否为注释行
                is_comment = any(pattern.search(stripped) for pattern in patterns)
                
                if is_comment:
                    comment_lines += 1
                else:
                    code_lines += 1
            
            return total_lines, code_lines, comment_lines
            
        except Exception as e:
            return 0, 0, 0
    
    def analyze_directory(self, dir_path: Path) -> Dict[str, int]:
        """分析目录中的所有代码文件"""
        file_lines = {}
        
        try:
            for root, dirs, files in os.walk(dir_path):
                # 修改dirs列表以排除不需要的目录
                dirs[:] = [d for d in dirs if not self.should_exclude_path(Path(root) / d)]
                
                for file in files:
                    file_path = Path(root) / file
                    
                    # 跳过隐藏文件和非代码文件
                    if file.startswith('.') or not self.is_code_file(file_path):
                        continue
                    
                    if self.should_exclude_path(file_path):
                        continue
                    
                    # 获取相对路径
                    try:
                        relative_path = file_path.relative_to(dir_path.parent)
                    except ValueError:
                        relative_path = file_path.relative_to(Path.cwd())
                    
                    # 统一路径分隔符为正斜杠（用于树形结构）
                    relative_path_str = str(relative_path).replace('\\', '/')
                    
                    lines = self.count_file_lines(file_path)
                    file_lines[relative_path_str] = lines
                    
                    # 记录详细信息
                    total, code, comments = self.count_code_lines(file_path)
                    self.file_details.append({
                        'path': str(relative_path),
                        'total_lines': total,
                        'code_lines': code,
                        'comment_lines': comments,
                        'file_size': file_path.stat().st_size if file_path.exists() else 0
                    })
        
        except Exception as e:
            pass
        
        return file_lines
    
    def build_tree_structure(self, file_data: Dict[str, int]) -> Dict:
        """构建树形结构"""
        tree = {}
        
        for file_path, lines in file_data.items():
            parts = file_path.split('/')
            current = tree
            
            for i, part in enumerate(parts):
                if i == len(parts) - 1:  # 最后一部分（文件）
                    current[part] = lines
                else:  # 目录
                    if part not in current:
                        current[part] = {}
                    current = current[part]
        
        return tree
    
    def analyze_paths(self, paths: List[str]) -> Dict:
        """分析多个路径"""
        self.results.clear()
        self.totals.clear()
        self.file_details.clear()
        
        for path_str in paths:
            if not os.path.exists(path_str):
                continue
                
            path = Path(path_str)
            if path.is_file() and self.is_code_file(path):
                # 单个文件分析
                relative_path = path.name
                lines = self.count_file_lines(path)
                self.results[path_str] = {relative_path: lines}
                self.totals[path_str] = lines
                
                # 记录详细信息
                total, code, comments = self.count_code_lines(path)
                self.file_details.append({
                    'path': relative_path,
                    'total_lines': total,
                    'code_lines': code,
                    'comment_lines': comments,
                    'file_size': path.stat().st_size if path.exists() else 0
                })
                
            elif path.is_dir():
                # 目录分析
                file_data = self.analyze_directory(path)
                if file_data:
                    self.results[path_str] = file_data
                    self.totals[path_str] = sum(file_data.values())
        
        return self.results
    
    def export_results(self, output_path: str, format_type: str = 'json') -> bool:
        """导出分析结果"""
        try:
            if format_type == 'json':
                # 转换配置中的set为list，以便JSON序列化
                json_config = {}
                for key, value in self.config.items():
                    if isinstance(value, set):
                        json_config[key] = list(value)
                    else:
                        json_config[key] = value
                
                with open(output_path, 'w', encoding='utf-8') as f:
                    json.dump({
                        'summary': dict(self.totals),
                        'files': self.file_details,
                        'config': json_config
                    }, f, ensure_ascii=False, indent=2)
                    
            elif format_type == 'csv':
                with open(output_path, 'w', newline='', encoding='utf-8') as f:
                    writer = csv.writer(f)
                    writer.writerow(['路径', '总行数', '代码行数', '注释行数', '文件大小'])
                    for detail in self.file_details:
                        writer.writerow([
                            detail['path'],
                            detail['total_lines'],
                            detail['code_lines'],
                            detail['comment_lines'],
                            detail['file_size']
                        ])
            
            elif format_type == 'tree':
                with open(output_path, 'w', encoding='utf-8') as f:
                    f.write("代码行数分析报告\n")
                    f.write("=" * 50 + "\n\n")
                    
                    for path, total_lines in self.totals.items():
                        f.write(f"路径: {path}\n")
                        f.write(f"总行数: {total_lines:,}\n")
                        f.write("-" * 30 + "\n")
                    
                    f.write(f"\n总计: {sum(self.totals.values()):,} 行\n")
                    f.write(f"总计文件: {len(self.file_details)} 个\n")
            
            return True
            
        except Exception as e:
            return False

# ==================== TUI 风格组件 ====================

class TUIButton(tk.Button):
    """自定义复古按钮"""
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

class PathInputDialog(tk.Toplevel):
    """路径输入对话框"""
    def __init__(self, parent, callback, title="添加路径"):
        super().__init__(parent)
        self.callback = callback
        self.title(title)
        self.geometry("600x400")
        self.configure(bg=STYLE_BG)
        
        # 居中显示
        x = parent.winfo_x() + 50
        y = parent.winfo_y() + 50
        self.geometry(f"+{x}+{y}")

        # 提示
        tk.Label(self, text="输入路径 (每行一个):", 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, anchor="w").pack(fill=tk.X, padx=10, pady=10)

        # 文本框容器
        container = tk.Frame(self, bg=STYLE_FG, bd=1)
        container.pack(fill=tk.BOTH, expand=True, padx=10, pady=(0, 10))
        
        self.text_area = tk.Text(container, bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, 
                                 relief="flat", bd=0, insertbackground=STYLE_FG)
        self.text_area.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)
        self.text_area.focus_set()

        # 底部按钮
        btn_frame = tk.Frame(self, bg=STYLE_BG, pady=10)
        btn_frame.pack(fill=tk.X, padx=10)
        
        TUIButton(btn_frame, "确认", self.on_confirm).pack(side=tk.RIGHT)
        TUIButton(btn_frame, "取消", self.destroy).pack(side=tk.RIGHT, padx=10)

    def on_confirm(self):
        content = self.text_area.get("1.0", tk.END)
        self.callback(content)
        self.destroy()

class ConfigDialog(tk.Toplevel):
    """配置对话框"""
    def __init__(self, parent, current_config, callback):
        super().__init__(parent)
        self.callback = callback
        self.config = current_config.copy()
        self.title("配置设置")
        self.geometry("500x400")
        self.configure(bg=STYLE_BG)
        
        # 居中显示
        x = parent.winfo_x() + 50
        y = parent.winfo_y() + 50
        self.geometry(f"+{x}+{y}")

        # 创建滚动区域
        canvas = tk.Canvas(self, bg=STYLE_BG, highlightthickness=0)
        scrollbar = tk.Scrollbar(self, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg=STYLE_BG)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # 代码扩展名配置
        tk.Label(scrollable_frame, text="代码文件扩展名 (用逗号分隔):", 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, anchor="w").pack(fill=tk.X, padx=10, pady=5)
        
        extensions_str = ','.join(self.config.get('code_extensions', set()))
        self.extensions_var = tk.StringVar(value=extensions_str)
        tk.Entry(scrollable_frame, textvariable=self.extensions_var, bg=STYLE_BG, fg=STYLE_FG, 
                font=STYLE_FONT, relief="solid", bd=1).pack(fill=tk.X, padx=10, pady=5)
        
        # 排除目录配置
        tk.Label(scrollable_frame, text="排除目录 (用逗号分隔):", 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, anchor="w").pack(fill=tk.X, padx=10, pady=5)
        
        exclude_dirs_str = ','.join(self.config.get('exclude_dirs', set()))
        self.exclude_dirs_var = tk.StringVar(value=exclude_dirs_str)
        tk.Entry(scrollable_frame, textvariable=self.exclude_dirs_var, bg=STYLE_BG, fg=STYLE_FG, 
                font=STYLE_FONT, relief="solid", bd=1).pack(fill=tk.X, padx=10, pady=5)
        
        # 自定义扩展名
        tk.Label(scrollable_frame, text="自定义扩展名 (用逗号分隔):", 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, anchor="w").pack(fill=tk.X, padx=10, pady=5)
        
        custom_ext_str = ','.join(self.config.get('custom_extensions', set()))
        self.custom_ext_var = tk.StringVar(value=custom_ext_str)
        tk.Entry(scrollable_frame, textvariable=self.custom_ext_var, bg=STYLE_BG, fg=STYLE_FG, 
                font=STYLE_FONT, relief="solid", bd=1).pack(fill=tk.X, padx=10, pady=5)
        
        # 是否显示行数
        tk.Label(scrollable_frame, text="显示选项:", 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, anchor="w").pack(fill=tk.X, padx=10, pady=(10, 5))
        
        self.show_line_count_var = tk.BooleanVar(value=self.config.get('show_line_count', True))
        show_line_count_check = tk.Checkbutton(scrollable_frame, text="显示行数 (例如: filename.py (122 行))", 
                                             variable=self.show_line_count_var, bg=STYLE_BG, fg=STYLE_FG, 
                                             font=STYLE_FONT, selectcolor=STYLE_BG, activebackground=STYLE_BG,
                                             activeforeground=STYLE_FG)
        show_line_count_check.pack(fill=tk.X, padx=10, pady=5)
        
        # 按钮区域
        btn_frame = tk.Frame(scrollable_frame, bg=STYLE_BG, pady=20)
        btn_frame.pack(fill=tk.X, padx=10)
        
        TUIButton(btn_frame, "保存配置", self.on_save).pack(side=tk.RIGHT)
        TUIButton(btn_frame, "取消", self.destroy).pack(side=tk.RIGHT, padx=10)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

    def on_save(self):
        try:
            # 更新配置
            self.config['code_extensions'] = {ext.strip() for ext in self.extensions_var.get().split(',') if ext.strip()}
            self.config['exclude_dirs'] = {dir_name.strip() for dir_name in self.exclude_dirs_var.get().split(',') if dir_name.strip()}
            self.config['custom_extensions'] = {ext.strip() for ext in self.custom_ext_var.get().split(',') if ext.strip()}
            self.config['show_line_count'] = self.show_line_count_var.get()
            
            self.callback(self.config)
            self.destroy()
        except Exception as e:
            messagebox.showerror("错误", f"配置保存失败: {str(e)}")

# ==================== 主程序 ====================

class CodeAnalyzerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("代码行数分析器 V2.0")
        self.root.geometry("900x700")
        self.root.configure(bg=STYLE_BG) 
        
        # 初始化分析器
        self.analyzer = CodeLinesAnalyzer()
        self.target_paths = []  # 存储目标路径
        self.analysis_results = {}

        self.setup_ui()

    def setup_ui(self):
        # 1. Header
        header_frame = tk.Frame(self.root, bg=STYLE_BG, pady=15, padx=15)
        header_frame.pack(fill=tk.X)
        title = TUILabel(header_frame, text="> SYSTEM.CODE_ANALYZER_V2.0")
        title.config(font=("Consolas", 14, "bold"))
        title.pack(side=tk.LEFT)

        # 2. Toolbar
        toolbar = tk.Frame(self.root, bg=STYLE_BG, pady=5, padx=15)
        toolbar.pack(fill=tk.X)

        # 按钮布局
        TUIButton(toolbar, "添加文件", self.add_files).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar, "添加目录", self.add_folder).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar, "批量导入", self.open_path_import).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar, "移除选中", self.remove_selected).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar, "清空列表", self.clear_all).pack(side=tk.LEFT, padx=(0, 10))

        # 第二行按钮
        toolbar2 = tk.Frame(self.root, bg=STYLE_BG, pady=5, padx=15)
        toolbar2.pack(fill=tk.X)
        
        TUIButton(toolbar2, "开始分析", self.start_analysis).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar2, "导出结果", self.export_results).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar2, "查看配置", self.open_config).pack(side=tk.LEFT, padx=(0, 10))
        TUIButton(toolbar2, "重置配置", self.reset_config).pack(side=tk.LEFT, padx=(0, 10))

        # 3. 列表区域
        list_container = tk.Frame(self.root, bg=STYLE_FG, bd=1)
        list_container.pack(fill=tk.BOTH, expand=True, padx=15, pady=15)
        
        inner_frame = tk.Frame(list_container, bg=STYLE_BG)
        inner_frame.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        # 状态显示
        status_text = "状态: 等待添加路径... (支持拖拽操作)"
        self.status_label = TUILabel(inner_frame, text=status_text)
        self.status_label.pack(anchor=tk.W, padx=5, pady=5)
        
        tk.Frame(inner_frame, bg=STYLE_FG, height=1).pack(fill=tk.X)

        # 路径列表
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

        # 4. 结果显示区域
        result_container = tk.Frame(self.root, bg=STYLE_BG, height=200)
        result_container.pack(fill=tk.X, padx=15, pady=(0, 15))
        result_container.pack_propagate(False)
        
        # 结果文本区域
        result_frame = tk.Frame(result_container, bg=STYLE_FG, bd=1)
        result_frame.pack(fill=tk.BOTH, expand=True)
        
        inner_result = tk.Frame(result_frame, bg=STYLE_BG)
        inner_result.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)
        
        self.result_text = tk.Text(inner_result, bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT,
                                  relief="flat", bd=0, state=tk.DISABLED)
        self.result_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=5, pady=5)
        
        result_scrollbar = tk.Scrollbar(inner_result, command=self.result_text.yview)
        result_scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.result_text.config(yscrollcommand=result_scrollbar.set)

        # 5. 底部状态栏
        footer = tk.Frame(self.root, bg=STYLE_BG, pady=10, padx=15)
        footer.pack(fill=tk.X)
        
        self.info_label = TUILabel(footer, text="就绪 - 请添加要分析的文件或目录")
        self.info_label.pack(anchor=tk.W)
        
        # 6. 拖拽支持
        self.setup_drag_drop()

    # === 路径管理方法 ===
    def open_path_import(self):
        PathInputDialog(self.root, self.process_path_import, "批量导入路径")

    def process_path_import(self, text_content):
        """处理批量导入的路径"""
        lines = text_content.strip().split('\n')
        added_count = 0
        
        for line in lines:
            line = line.strip().strip('"').strip("'")
            if not line:
                continue
            
            if os.path.isabs(line):
                full_path = os.path.normpath(line)
            else:
                full_path = os.path.normpath(os.path.join(os.getcwd(), line))
            
            if full_path not in self.target_paths:
                self.target_paths.append(full_path)
                added_count += 1
                
        self.refresh_path_list()
        self.status_label.config(text=f"状态: 已添加 {added_count} 个路径")

    def add_files(self):
        files = filedialog.askopenfilenames(initialdir=os.getcwd(), title="选择代码文件")
        if files:
            for f in files:
                if f not in self.target_paths:
                    self.target_paths.append(f)
            self.refresh_path_list()

    def add_folder(self):
        folder = filedialog.askdirectory(initialdir=os.getcwd(), title="选择目录")
        if folder:
            if folder not in self.target_paths:
                self.target_paths.append(folder)
            self.refresh_path_list()

    def remove_selected(self):
        selected_indices = self.listbox.curselection()
        for i in reversed(selected_indices):
            del self.target_paths[i]
        self.refresh_path_list()
        self.status_label.config(text="状态: 已移除选中的路径")

    def clear_all(self):
        self.target_paths = []
        self.refresh_path_list()
        self.status_label.config(text="状态: 列表已清空")

    def refresh_path_list(self):
        """刷新路径列表显示"""
        self.listbox.delete(0, tk.END)
        
        for path in self.target_paths:
            exists = os.path.exists(path)
            
            try:
                display_path = os.path.relpath(path, os.getcwd())
            except ValueError:
                display_path = path
            
            if not exists:
                prefix = "[缺失] "
            elif os.path.isdir(path):
                prefix = "[目录] "
            else:
                prefix = "[文件] "
            
            display_text = f"{prefix}{display_path}"
            self.listbox.insert(tk.END, display_text)
            
        # 更新底部信息
        if self.target_paths:
            self.info_label.config(text=f"已添加 {len(self.target_paths)} 个路径")
        else:
            self.info_label.config(text="就绪 - 请添加要分析的文件或目录")

    # === 分析功能 ===
    def start_analysis(self):
        if not self.target_paths:
            messagebox.showwarning("警告", "请先添加要分析的文件或目录")
            return
        
        # 检查路径有效性
        valid_paths = [p for p in self.target_paths if os.path.exists(p)]
        if not valid_paths:
            messagebox.showwarning("警告", "没有找到有效的路径")
            return
        
        self.status_label.config(text="状态: 正在分析...")
        self.root.update()
        
        try:
            # 执行分析
            self.analysis_results = self.analyzer.analyze_paths(valid_paths)
            
            # 显示结果
            self.display_analysis_results()
            
            self.status_label.config(text="状态: 分析完成")
            
            # 显示统计信息
            total_files = len(self.analyzer.file_details)
            total_lines = sum(self.analyzer.totals.values())
            self.info_label.config(text=f"分析完成 - 处理路径: {len(valid_paths)}, 分析文件: {total_files}, 总行数: {total_lines:,}")
            
        except Exception as e:
            self.status_label.config(text="状态: 分析失败")
            messagebox.showerror("错误", f"分析过程中发生错误: {str(e)}")

    def display_analysis_results(self):
        """显示分析结果"""
        self.result_text.config(state=tk.NORMAL)
        self.result_text.delete(1.0, tk.END)
        
        if not self.analysis_results:
            self.result_text.insert(tk.END, "暂无分析结果")
        else:
            # 显示树形结构
            self.result_text.insert(tk.END, "代码行数分析结果\n")
            self.result_text.insert(tk.END, "=" * 50 + "\n\n")
            
            grand_total_files = 0
            grand_total_lines = 0
            
            for path, file_data in self.analysis_results.items():
                try:
                    display_path = os.path.relpath(path, os.getcwd())
                except ValueError:
                    display_path = path
                
                self.result_text.insert(tk.END, f"路径: {display_path}\n")
                self.result_text.insert(tk.END, f"总行数: {sum(file_data.values()):,}\n")
                self.result_text.insert(tk.END, "-" * 30 + "\n")
                
                tree = self.analyzer.build_tree_structure(file_data)
                self.print_tree_to_text(tree, "")
                
                file_count = len(file_data)
                line_count = sum(file_data.values())
                grand_total_files += file_count
                grand_total_lines += line_count
                
                self.result_text.insert(tk.END, f"小计: {file_count} 文件, {line_count:,} 行\n\n")
            
            # 总计
            self.result_text.insert(tk.END, "=" * 50 + "\n")
            self.result_text.insert(tk.END, f"总计: {grand_total_files} 文件, {grand_total_lines:,} 行\n")
        
        self.result_text.config(state=tk.DISABLED)

    def print_tree_to_text(self, tree: Dict, prefix: str):
        """打印树形结构到文本框"""
        items = list(tree.items())
        
        for i, (name, value) in enumerate(items):
            is_last_item = i == len(items) - 1
            current_prefix = "└── " if is_last_item else "├── "
            
            if isinstance(value, dict):  # 目录
                self.result_text.insert(tk.END, f"{prefix}{current_prefix}{name}/\n")
                extension_prefix = prefix + ("    " if is_last_item else "│   ")
                self.print_tree_to_text(value, extension_prefix)
            else:  # 文件
                # 根据配置决定是否显示行数
                show_line_count = self.analyzer.config.get('show_line_count', True)
                if show_line_count:
                    self.result_text.insert(tk.END, f"{prefix}{current_prefix}{name} ({value:,} 行)\n")
                else:
                    self.result_text.insert(tk.END, f"{prefix}{current_prefix}{name}\n")

    # === 导出功能 ===
    def export_results(self):
        if not self.analysis_results:
            messagebox.showwarning("警告", "请先执行分析")
            return
        
        # 选择导出格式
        format_window = tk.Toplevel(self.root)
        format_window.title("选择导出格式")
        format_window.geometry("300x150")
        format_window.configure(bg=STYLE_BG)
        format_window.transient(self.root)
        format_window.grab_set()
        
        # 居中显示
        x = self.root.winfo_x() + 200
        y = self.root.winfo_y() + 200
        format_window.geometry(f"+{x}+{y}")
        
        tk.Label(format_window, text="选择导出格式:", bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT).pack(pady=10)
        
        def export_json():
            filename = filedialog.asksaveasfilename(
                defaultextension=".json",
                filetypes=[("JSON files", "*.json"), ("All files", "*.*")]
            )
            if filename:
                if self.analyzer.export_results(filename, 'json'):
                    messagebox.showinfo("成功", "结果已导出到 JSON 文件")
                else:
                    messagebox.showerror("错误", "导出失败")
            format_window.destroy()
        
        def export_csv():
            filename = filedialog.asksaveasfilename(
                defaultextension=".csv",
                filetypes=[("CSV files", "*.csv"), ("All files", "*.*")]
            )
            if filename:
                if self.analyzer.export_results(filename, 'csv'):
                    messagebox.showinfo("成功", "结果已导出到 CSV 文件")
                else:
                    messagebox.showerror("错误", "导出失败")
            format_window.destroy()
        
        def export_tree():
            filename = filedialog.asksaveasfilename(
                defaultextension=".txt",
                filetypes=[("Text files", "*.txt"), ("All files", "*.*")]
            )
            if filename:
                if self.analyzer.export_results(filename, 'tree'):
                    messagebox.showinfo("成功", "结果已导出到文本文件")
                else:
                    messagebox.showerror("错误", "导出失败")
            format_window.destroy()
        
        tk.Button(format_window, text="JSON 格式", command=export_json, 
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, relief="solid", bd=1).pack(pady=5, padx=20, fill=tk.X)
        tk.Button(format_window, text="CSV 格式", command=export_csv,
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, relief="solid", bd=1).pack(pady=5, padx=20, fill=tk.X)
        tk.Button(format_window, text="文本格式", command=export_tree,
                 bg=STYLE_BG, fg=STYLE_FG, font=STYLE_FONT, relief="solid", bd=1).pack(pady=5, padx=20, fill=tk.X)

    # === 配置管理 ===
    def open_config(self):
        ConfigDialog(self.root, self.analyzer.config, self.apply_config)

    def apply_config(self, new_config):
        """应用新配置"""
        self.analyzer.config = new_config
        self.status_label.config(text="状态: 配置已更新")

    def reset_config(self):
        """重置配置为默认值"""
        self.analyzer.config = {
            'code_extensions': {
                '.js', '.jsx', '.ts', '.tsx', '.py', '.css', '.scss', '.sass', 
                '.html', '.json', '.md', '.yml', '.yaml', '.xml', '.java', '.cpp', 
                '.c', '.h', '.cs', '.php', '.rb', '.go', '.rs', '.swift', '.kt', 
                '.scala', '.r', '.m', '.mm', '.sh', '.bat', '.ps1', '.sql'
            },
            'exclude_dirs': {'.git', '__pycache__', 'node_modules', '.vscode', 
                           '.idea', 'dist', 'build', '.next', '.nuxt', 'coverage'},
            'exclude_files': {'.DS_Store', 'Thumbs.db', '*.tmp', '*.log'},
            'custom_extensions': set(),
            'show_line_count': True
        }
        self.status_label.config(text="状态: 配置已重置")
        
    # === 拖拽支持功能 ===
    def setup_drag_drop(self):
        """设置拖拽支持"""
        if not DRAG_DROP_SUPPORTED:
            self.status_label.config(text="状态: 拖拽功能不可用（需要安装 tkinterdnd2）")
            return
            
        # 支持在主窗口、列表区域和结果区域拖拽
        widgets_to_bind = [self.root, self.listbox, self.result_text]
        
        for widget in widgets_to_bind:
            if hasattr(widget, 'drop_target_register'):
                widget.drop_target_register(DND_FILES)
                widget.dnd_bind('<<Drop>>', self.on_drop)
                widget.dnd_bind('<<DragEnter>>', self.on_drag_enter)
                widget.dnd_bind('<<DragLeave>>', self.on_drag_leave)
    
    def on_drag_enter(self, event):
        """拖拽进入时的视觉效果"""
        self.root.configure(bg=STYLE_FG)
        self.status_label.config(text="状态: 拖拽文件或文件夹到此处...")
        
    def on_drag_leave(self, event):
        """拖拽离开时的视觉效果"""
        self.root.configure(bg=STYLE_BG)
        self.status_label.config(text="状态: 等待添加路径... (支持拖拽操作)")
        
    def on_drop(self, event):
        """处理拖拽释放"""
        self.root.configure(bg=STYLE_BG)
        
        # 获取拖拽的数据
        try:
            # tkinterdnd2 返回的数据格式通常是 {path1} {path2} ... 或 {file://path}
            data = event.data
            
            # 清理数据格式
            paths = []
            import re
            
            # 处理大括号包围的路径
            braced_paths = re.findall(r'\{([^}]+)\}', data)
            if braced_paths:
                paths.extend(braced_paths)
            else:
                # 处理空格分隔的路径
                paths = data.split()
            
            added_count = 0
            for path_str in paths:
                # 清理路径
                path_str = path_str.strip('{}').strip('"').strip("'")
                
                # 转换为绝对路径
                if os.path.isabs(path_str):
                    full_path = os.path.normpath(path_str)
                else:
                    full_path = os.path.normpath(os.path.join(os.getcwd(), path_str))
                
                # 检查路径是否存在
                if os.path.exists(full_path) and full_path not in self.target_paths:
                    self.target_paths.append(full_path)
                    added_count += 1
                    
            if added_count > 0:
                self.refresh_path_list()
                self.status_label.config(text=f"状态: 已添加 {added_count} 个拖拽的路径")
            else:
                self.status_label.config(text="状态: 没有有效的路径被添加")
                
        except Exception as e:
            self.status_label.config(text=f"状态: 拖拽处理错误 - {str(e)}")
            print(f"拖拽处理错误: {e}")

def main():
    if DRAG_DROP_SUPPORTED:
        root = TkinterDnD.Tk()
    else:
        root = tk.Tk()
        print("警告: 未安装 tkinterdnd2，拖拽功能不可用。安装命令: pip install tkinterdnd2")
    
    try:
        from ctypes import windll
        windll.shcore.SetProcessDpiAwareness(1)
    except:
        pass
        
    app = CodeAnalyzerApp(root)
    root.mainloop()

if __name__ == "__main__":
    main()