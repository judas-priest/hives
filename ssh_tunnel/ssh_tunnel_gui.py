#!/usr/bin/env python3
import json
import os
import signal
import subprocess
import sys
import threading
import time
import tkinter as tk
from pathlib import Path
from tkinter import messagebox, scrolledtext, ttk

import pystray
from PIL import Image, ImageDraw


class SSHTunnelApp:
    def __init__(self, root, start_minimized=True):
        self.root = root
        self.start_minimized = start_minimized
        
        # Принудительно включаем тёмную тему для KDE Plasma 6
        # Если у вас светлая тема в системе, измените на False
        self.force_dark_theme = True
        
        self.setup_system_theme()

        self.root.title("SSH Tunnel Manager - Arch Linux")
        self.root.geometry("700x600")
        self.root.resizable(True, True)
        
        # Настраиваем окно в зависимости от темы
        self.apply_window_theme()

        # Инициализируем основные переменные состояния
        self.ssh_process = None
        self.is_running = False

        # Иконка для трея
        self.tray_icon = None
        self.tray_running = False
        self.tray_thread = None
        self.setup_tray_icon()
        self.auto_reconnect = True
        self.restore_connection = True  # Новая переменная для восстановления подключения
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.reconnect_delay = 3  # seconds - уменьшено для более быстрого переподключения

        self.config_file = Path.home() / ".config" / "ssh_tunnel_gui" / "config.json"
        self.known_hosts_file = Path.home() / ".ssh" / "known_hosts"

        # Создаем директорию для конфига если нет
        self.config_file.parent.mkdir(parents=True, exist_ok=True)

        # Обработка сигналов для graceful shutdown
        signal.signal(signal.SIGINT, self.signal_handler)
        signal.signal(signal.SIGTERM, self.signal_handler)

        self.setup_ui()
        self.load_config()
        
        # Если нужно запускаться свёрнутым в трей
        if self.start_minimized:
            self.root.after(100, self.hide_to_tray)
        
        # Проверяем, нужно ли восстановить подключение (после загрузки UI)
        # Уменьшаем задержку для более быстрого восстановления
        self.root.after(200, self.check_restore_connection)
        
        self.log_message("🚀 SSH Tunnel Manager initialized")
        self.log_message(f"   Auto-reconnect: {self.auto_reconnect}")
        self.log_message(f"   Restore connection: {self.restore_connection}")
        self.log_message(f"   Start minimized: {self.start_minimized}")

    def setup_system_theme(self):
        """Настройка системной темы"""
        try:
            self.style = ttk.Style()
            
            # Определяем тёмную тему
            self.is_dark_theme = self.detect_dark_theme()
            print(f"Dark theme detected: {self.is_dark_theme}")
            
            # Принудительно применяем цвета в зависимости от определенной темы
            if self.is_dark_theme:
                print("Applying dark theme colors")
                self.apply_dark_theme_force()
            else:
                print("Applying light theme colors")
                self.apply_light_theme_force()

        except Exception as e:
            print(f"Theme error: {e}")
            self.style = ttk.Style()
            self.is_dark_theme = False

    def setup_kde_theme(self):
        """Настройка KDE темы"""
        try:
            # Пытаемся загрузить системную тему через tcl
            kde_themes = [
                "/usr/share/themes/Breeze-Dark/ttkthemes/breeze-dark.tcl",
                "/usr/share/themes/Breeze/ttkthemes/breeze.tcl", 
                "/usr/share/themes/Adwaita/ttkthemes/adwaita-dark.tcl",
                "/usr/share/themes/Adwaita/ttkthemes/adwaita.tcl",
                "/usr/share/tk-themes/ttk-themes/themes/breeze-dark/breeze-dark.tcl",
                "/usr/share/tk-themes/ttk-themes/themes/breeze/breeze.tcl"
            ]
            
            theme_loaded = False
            for theme_path in kde_themes:
                if os.path.exists(theme_path):
                    try:
                        theme_name = os.path.basename(theme_path).replace('.tcl', '')
                        self.root.tk.call("source", theme_path)
                        self.root.tk.call("ttk::setTheme", theme_name)
                        theme_loaded = True
                        break
                    except:
                        continue

            if theme_loaded:
                return True

            # Альтернативно - пробуем стандартные KDE ttk темы
            kde_ttk_themes = {
                "breeze-dark": self.is_dark_theme,
                "breeze": not self.is_dark_theme,
                "adwaita-dark": self.is_dark_theme,
                "adwaita": not self.is_dark_theme,
                "oxygen": not self.is_dark_theme,
                "qt5ct-style": True  # universal fallback
            }

            available_themes = self.style.theme_names()
            for theme, should_use in kde_ttk_themes.items():
                if theme in available_themes and should_use:
                    self.style.theme_use(theme)
                    return True

            return False
        except Exception as e:
            print(f"KDE theme setup error: {e}")
            return False

    def setup_system_theme_ttk(self):
        """Пытается настроить системную тему ttk"""
        try:
            available_themes = self.style.theme_names()
            
            # Системные темы в порядке приоритета
            if self.is_dark_theme:
                system_dark_themes = ["breeze-dark", "adwaita-dark", "arc-dark", "clam", "alt"]
                for theme in system_dark_themes:
                    if theme in available_themes:
                        self.style.theme_use(theme)
                        return True
            else:
                system_light_themes = ["breeze", "adwaita", "arc", "clam", "default", "alt"]
                for theme in system_light_themes:
                    if theme in available_themes:
                        self.style.theme_use(theme)
                        return True

            return False
        except:
            return False

    def apply_theme_colors(self):
        """Применяет цвета в зависимости от темы"""
        try:
            if self.is_dark_theme:
                self.setup_dark_colors()
            else:
                self.setup_light_colors()
        except:
            pass

    def setup_dark_theme_fallback(self):
        """Принудительное применение тёмной темы"""
        try:
            # Принудительно используем ttk тему
            available_themes = self.style.theme_names()
            
            # Попробуем различные тёмные темы в порядке приоритета
            dark_themes = ["breeze-dark", "adwaita-dark", "arc-dark", "clam", "alt", "default"]
            
            for theme in dark_themes:
                if theme in available_themes:
                    try:
                        self.style.theme_use(theme)
                        print(f"Applied dark theme: {theme}")
                        break
                    except:
                        continue
            
            # Применяем принудительные стили
            self.setup_dark_colors()
            self.apply_window_theme()
            
        except Exception as e:
            print(f"Dark theme fallback error: {e}")

    def setup_light_theme_fallback(self):
        """Принудительное применение светлой темы"""
        try:
            # Принудительно используем ttk тему
            available_themes = self.style.theme_names()
            
            # Попробуем различные светлые темы в порядке приоритета
            light_themes = ["breeze", "adwaita", "arc", "clam", "default", "alt"]
            
            for theme in light_themes:
                if theme in available_themes:
                    try:
                        self.style.theme_use(theme)
                        print(f"Applied light theme: {theme}")
                        break
                    except:
                        continue
            
            # Применяем принудительные стили
            self.setup_light_colors()
            self.apply_window_theme()
            
        except Exception as e:
            print(f"Light theme fallback error: {e}")

    def apply_window_theme(self):
        """Настройка окна под системную тему"""
        try:
            if self.is_dark_theme:
                # Темная тема
                self.root.configure(bg="#2d2d2d")
                # Также обновляем все существующие фреймы
                self.update_all_frames_bg("#2d2d2d")
            else:
                # Светлая тема - используем системные цвета
                self.root.configure(bg="SystemButtonFace")
                self.update_all_frames_bg("SystemButtonFace")
        except Exception as e:
            print(f"Window theme error: {e}")

    def update_all_frames_bg(self, bg_color):
        """Обновляет фон всех фреймов в окне"""
        try:
            for widget in self.root.winfo_children():
                if hasattr(widget, 'configure'):
                    try:
                        # Обновляем фон виджета
                        widget.configure(bg=bg_color)
                        
                        # Рекурсивно обновляем дочерние виджеты
                        for child in widget.winfo_children():
                            if hasattr(child, 'configure'):
                                try:
                                    child.configure(bg=bg_color)
                                except:
                                    pass
                    except:
                        pass
        except Exception as e:
            print(f"Frame bg update error: {e}")

    def detect_dark_theme(self):
        """Определяет темную тему системы"""
        print("Detecting system theme...")
        
        try:
            # Способ 1: Проверка KDE Plasma - проверяем конфигурационные файлы
            kde_config_file = Path.home() / ".config/kdeglobals"
            if kde_config_file.exists():
                print("Found kdeglobals file")
                try:
                    with open(kde_config_file, 'r') as f:
                        content = f.read().lower()
                        if 'colorscheme' in content:
                            lines = content.split('\n')
                            for line in lines:
                                if 'colorscheme' in line and '=' in line:
                                    scheme = line.split('=', 1)[1].strip()
                                    print(f"KDE Color Scheme: {scheme}")
                                    if 'dark' in scheme:
                                        return True
                except Exception as e:
                    print(f"Error reading kdeglobals: {e}")
            
            # Способ 2: Проверка через qdbus (Plasma 6)
            try:
                print("Trying qdbus for theme detection...")
                result = subprocess.run(
                    ["qdbus", "org.kde.KGlobalSettings", "/KGlobalSettings", 
                     "org.kde.KGlobalSettings.themeName"],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if result.returncode == 0:
                    theme_name = result.stdout.strip().lower()
                    print(f"Theme via qdbus: {theme_name}")
                    dark_themes = ["breeze dark", "adwaita dark", "dark", "dark breeze"]
                    if any(dark_theme in theme_name for dark_theme in dark_themes):
                        return True
            except Exception as e:
                print(f"qdbus error: {e}")

            # Способ 3: Проверка через kreadconfig6/kreadconfig5
            kde_config_commands = ["kreadconfig6", "kreadconfig5"]
            for cmd in kde_config_commands:
                try:
                    print(f"Trying {cmd}...")
                    result = subprocess.run(
                        [cmd, "--group", "General", "--key", "ColorScheme"],
                        capture_output=True,
                        text=True,
                        timeout=3
                    )
                    if result.returncode == 0:
                        scheme = result.stdout.strip()
                        print(f"Color scheme via {cmd}: {scheme}")
                        if "Dark" in scheme:
                            return True
                except Exception as e:
                    print(f"{cmd} error: {e}")
                    continue

            # Способ 2: Проверка через Qt theme (Plasma 6)
            try:
                # Проверяем через qt6ct если установлен
                qt_config_file = Path.home() / ".config/qt6ct/qt6ct.conf"
                if qt_config_file.exists():
                    with open(qt_config_file, 'r') as f:
                        content = f.read()
                        if "dark" in content.lower() and "color_scheme" in content.lower():
                            return True
            except:
                pass

            # Способ 3: Проверка через qt5ct если установлен
            try:
                qt5_config_file = Path.home() / ".config/qt5ct/qt5ct.conf"
                if qt5_config_file.exists():
                    with open(qt5_config_file, 'r') as f:
                        content = f.read()
                        if "dark" in content.lower() and "color_scheme" in content.lower():
                            return True
            except:
                pass

            # Способ 4: Проверка GTK темы
            gtk_theme = os.environ.get("GTK_THEME", "").lower()
            if "dark" in gtk_theme:
                return True

            # Способ 5: Проверка через gsettings (GNOME)
            try:
                result = subprocess.run(
                    ["gsettings", "get", "org.gnome.desktop.interface", "gtk-theme"],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0 and "dark" in result.stdout.lower():
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass

            # Способ 6: Проверка через xdg-theme (общий для DE)
            try:
                result = subprocess.run(
                    ["xdg-theme", "get", "gtk-theme"],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0 and "dark" in result.stdout.lower():
                    return True
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass

            # Способ 7: Проверка через xrdb (X11)
            try:
                result = subprocess.run(
                    ["xrdb", "-query"],
                    capture_output=True,
                    text=True,
                    timeout=2
                )
                if result.returncode == 0:
                    # Ищем цвета фона в xrdb
                    for line in result.stdout.split('\n'):
                        if 'background' in line.lower():
                            parts = line.split()
                            if len(parts) >= 2:
                                bg_color = parts[-1]
                                if bg_color.startswith("#"):
                                    # Проверка яркости цвета
                                    hex_color = bg_color[1:]
                                    if len(hex_color) >= 6:
                                        try:
                                            r = int(hex_color[0:2], 16)
                                            g = int(hex_color[2:4], 16)
                                            b = int(hex_color[4:6], 16)
                                            brightness = (r + g + b) / 3
                                            if brightness < 128:
                                                return True
                                        except ValueError:
                                            continue
            except (subprocess.TimeoutExpired, FileNotFoundError, subprocess.SubprocessError):
                pass

            # Способ 8: Проверка системных переменных Qt
            qt_theme = os.environ.get("QT_QPA_PLATFORMTHEME", "").lower()
            if "dark" in qt_theme or "breeze" in qt_theme:
                return True

            # Способ 9: Проверка через ksysguard (если доступен)
            try:
                # Проверяем переменные окружения KDE
                kde_theme = os.environ.get("KDE_COLOR_SCHEME", "").lower()
                if "dark" in kde_theme:
                    return True
                
                kde_plasma_theme = os.environ.get("KDE_FULL_SESSION_VERSION", "")
                if kde_plasma_theme:
                    # Проверяем цветовую схему через kdeglobals
                    kdeglobals = Path.home() / ".config/kdeglobals"
                    if kdeglobals.exists():
                        with open(kdeglobals, 'r') as f:
                            content = f.read()
                            for line in content.split('\n'):
                                if 'ColorScheme' in line and '=' in line:
                                    scheme = line.split('=', 1)[1].strip()
                                    if 'dark' in scheme.lower():
                                        return True
            except:
                pass

            # Способ 10: Проверка через время суток (fallback)
            # Если системное время вечер/ночь, вероятно тёмная тема
            current_hour = time.localtime().tm_hour
            if current_hour >= 19 or current_hour <= 7:
                return True

        except Exception as e:
            print(f"Theme detection error: {e}")

        return False

    def apply_dark_theme_force(self):
        """Принудительное применение темной темы"""
        try:
            # Применяем темные цвета
            self.setup_dark_colors()
            
            # Настраиваем окно
            self.apply_window_theme()
            
            # Переопределяем все основные виджеты
            self.force_widget_themes()
            
        except Exception as e:
            print(f"Dark theme force error: {e}")

    def apply_light_theme_force(self):
        """Принудительное применение светлой темы"""
        try:
            # Применяем светлые цвета
            self.setup_light_colors()
            
            # Настраиваем окно
            self.apply_window_theme()
            
            # Переопределяем все основные виджеты
            self.force_widget_themes()
            
        except Exception as e:
            print(f"Light theme force error: {e}")

    def force_widget_themes(self):
        """Принудительно переопределяет стили основных виджетов"""
        try:
            # Основные стили - убираем видимые границы для текстовых виджетов
            self.style.configure(".", 
                               background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace",
                               foreground="#ffffff" if self.is_dark_theme else "SystemButtonText",
                               fieldbackground="#383838" if self.is_dark_theme else "SystemWindow",
                               fieldforeground="#ffffff" if self.is_dark_theme else "SystemWindowText",
                               lightcolor="#404040" if self.is_dark_theme else "SystemLight",
                               darkcolor="#202020" if self.is_dark_theme else "SystemDark",
                               borderwidth=0,  # Убираем видимые границы
                               relief="flat")   # Плоский стиль без рельефа
            
            # Специфические виджеты
            self.style.configure("TFrame", background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace")
            self.style.configure("TLabel", background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace", 
                               foreground="#ffffff" if self.is_dark_theme else "SystemButtonText",
                               borderwidth=0,   # Убираем границы для меток
                               relief="flat")
            self.style.configure("TButton", background="#404040" if self.is_dark_theme else "SystemButtonFace",
                               foreground="#ffffff" if self.is_dark_theme else "SystemButtonText",
                               borderwidth=0,   # Минимальные границы для кнопок
                               relief="flat")
            self.style.map("TButton", 
                          background=[("active", "#505050" if self.is_dark_theme else "SystemHighlight")],
                          foreground=[("active", "#ffffff" if self.is_dark_theme else "SystemHighlightText")])
            
            # Поля ввода - минимальные границы только для активного состояния
            self.style.configure("TEntry", fieldbackground="#383838" if self.is_dark_theme else "SystemWindow",
                               foreground="#ffffff" if self.is_dark_theme else "SystemWindowText",
                               borderwidth=1,   # Тонкие границы для полей ввода
                               relief="solid")
            self.style.configure("TCombobox", fieldbackground="#383838" if self.is_dark_theme else "SystemWindow",
                               foreground="#ffffff" if self.is_dark_theme else "SystemWindowText",
                               borderwidth=1,
                               relief="solid")
            
            # Скроллбары
            self.style.configure("TScrollbar", background="#404040" if self.is_dark_theme else "SystemScrollbar")
            self.style.map("TScrollbar", 
                          background=[("active", "#505050" if self.is_dark_theme else "SystemHighlight")])
            
            # Рамки с заголовками - только для визуального разделения
            self.style.configure("TLabelframe", background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace",
                               borderwidth=1,   # Тонкая рамка для группировки
                               relief="solid")
            self.style.configure("TLabelframe.Label", background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace",
                               foreground="#ffffff" if self.is_dark_theme else "SystemButtonText",
                               borderwidth=0,
                               relief="flat")
            
            # Чекбоксы
            self.style.configure("TCheckbutton", background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace",
                               foreground="#ffffff" if self.is_dark_theme else "SystemButtonText",
                               borderwidth=0,
                               relief="flat")
            self.style.map("TCheckbutton", 
                          background=[("active", "#404040" if self.is_dark_theme else "SystemHighlight")])
            
            # Радиокнопки
            self.style.configure("TRadiobutton", background="#2d2d2d" if self.is_dark_theme else "SystemButtonFace",
                               foreground="#ffffff" if self.is_dark_theme else "SystemButtonText",
                               borderwidth=0,
                               relief="flat")
            self.style.map("TRadiobutton", 
                          background=[("active", "#404040" if self.is_dark_theme else "SystemHighlight")])
            
        except Exception as e:
            print(f"Widget theming error: {e}")

    def setup_dark_colors(self):
        """Устанавливает цвета для темной темы"""
        try:
            self.root.configure(bg="#2d2d2d")
            self.style.configure(".", background="#2d2d2d", foreground="#ffffff", borderwidth=0, relief="flat")
            self.style.configure("TFrame", background="#2d2d2d")
            self.style.configure("TLabel", background="#2d2d2d", foreground="#ffffff", borderwidth=0, relief="flat")
            self.style.configure("TButton", background="#383838", foreground="#ffffff", borderwidth=0, relief="flat")
            self.style.configure(
                "TEntry", fieldbackground="#383838", foreground="#ffffff", borderwidth=1, relief="solid"
            )
            self.style.configure(
                "TCombobox", fieldbackground="#383838", foreground="#ffffff", borderwidth=1, relief="solid"
            )
            self.style.configure("TScrollbar", background="#383838")
            self.style.configure("TLabelframe", background="#2d2d2d", borderwidth=1, relief="solid")
            self.style.configure("TLabelframe.Label", background="#2d2d2d", foreground="#ffffff", borderwidth=0, relief="flat")
            self.style.configure("TCheckbutton", background="#2d2d2d", foreground="#ffffff", borderwidth=0, relief="flat")
            self.style.configure("TRadiobutton", background="#2d2d2d", foreground="#ffffff", borderwidth=0, relief="flat")
        except:
            pass

    def setup_light_colors(self):
        """Устанавливает цвета для светлой темы"""
        try:
            self.root.configure(bg="SystemButtonFace")
            self.style.configure(".", background="SystemButtonFace", foreground="SystemButtonText", borderwidth=0, relief="flat")
            self.style.configure("TFrame", background="SystemButtonFace")
            self.style.configure("TLabel", background="SystemButtonFace", foreground="SystemButtonText", borderwidth=0, relief="flat")
            self.style.configure("TButton", background="SystemButtonFace", foreground="SystemButtonText", borderwidth=0, relief="flat")
            self.style.configure(
                "TEntry", fieldbackground="SystemWindow", foreground="SystemWindowText", borderwidth=1, relief="solid"
            )
            self.style.configure(
                "TCombobox", fieldbackground="SystemWindow", foreground="SystemWindowText", borderwidth=1, relief="solid"
            )
            self.style.configure("TScrollbar", background="SystemScrollbar")
            self.style.configure("TLabelframe", background="SystemButtonFace", borderwidth=1, relief="solid")
            self.style.configure("TLabelframe.Label", background="SystemButtonFace", foreground="SystemButtonText", borderwidth=0, relief="flat")
            self.style.configure("TCheckbutton", background="SystemButtonFace", foreground="SystemButtonText", borderwidth=0, relief="flat")
            self.style.configure("TRadiobutton", background="SystemButtonFace", foreground="SystemButtonText", borderwidth=0, relief="flat")
        except:
            pass

    def setup_tray_icon(self):
        """Настройка системного трея"""
        self.tray_icon = None
        self.tray_running = False
        self.tray_thread = None
        
        # При закрытии (X) - закрываем приложение
        self.root.protocol("WM_DELETE_WINDOW", self.cleanup_and_quit)
        
        # При сворачивании (minimize) - сворачиваем в трей
        self.root.bind("<Unmap>", self.on_minimize)

    

    def update_tray_icon(self, connected=False):
        """Обновляет иконку в трее"""
        if self.tray_icon and self.tray_running:
            def create_image(connected):
                size = 64
                image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
                dc = ImageDraw.Draw(image)

                if connected:
                    color = "#00ff00"  # Зеленый
                else:
                    color = "#ff0000"  # Красный

                dc.rectangle([16, 16, 48, 48], fill=color, outline="#ffffff", width=2)
                dc.rectangle([20, 20, 44, 44], fill="#ffffff")
                dc.rectangle([24, 24, 40, 40], fill=color)

                return image

            try:
                self.tray_icon.icon = create_image(connected)
                status = "Connected" if connected else "Disconnected"
                self.tray_icon.title = f"SSH Tunnel Manager ({status})"
            except Exception as e:
                print(f"Error updating tray icon: {e}")

    def hide_to_tray(self):
        """Скрыть окно в трей"""
        print("Hiding to tray...")
        
        # Сворачиваем окно
        self.root.withdraw()
        
        # Создаем иконку если её нет
        if not self.tray_icon or not self.tray_running:
            self.create_new_tray_icon()
            
            # Запускаем трей в отдельном потоке
            self.tray_running = True
            self.tray_thread = threading.Thread(target=self._run_tray_loop, daemon=True)
            self.tray_thread.start()

    def create_new_tray_icon(self):
        """Создает новую иконку трея"""
        # Останавливаем старую иконку если есть
        if self.tray_icon:
            try:
                self.tray_icon.stop()
            except:
                pass
        
        # Создаем новую иконку
        def create_image(connected=False):
            size = 64
            image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
            dc = ImageDraw.Draw(image)

            if connected:
                color = "#00ff00"  # Зеленый
            else:
                color = "#ff0000"  # Красный

            dc.rectangle([16, 16, 48, 48], fill=color, outline="#ffffff", width=2)
            dc.rectangle([20, 20, 44, 44], fill="#ffffff")
            dc.rectangle([24, 24, 40, 40], fill=color)

            return image

        def show_window(icon, item):
            self.root.after(0, self.show_from_tray)

        def toggle_connection(icon, item):
            self.root.after(0, self.toggle_connection)

        def quit_app(icon, item):
            self.root.after(0, self.cleanup_and_quit)

        # Создаем меню
        menu = pystray.Menu(
            pystray.MenuItem("Show", show_window),
            pystray.MenuItem("Toggle Connection", toggle_connection),
            pystray.MenuItem("Quit", quit_app),
        )

        # Создаем новую иконку
        self.tray_icon = pystray.Icon(
            "ssh_tunnel", 
            create_image(self.is_running), 
            "SSH Tunnel Manager (Disconnected)", 
            menu
        )

    def _run_tray_loop(self):
        """Цикл работы трея"""
        try:
            print("Starting tray loop...")
            self.tray_icon.run()
        except Exception as e:
            print(f"Tray loop error: {e}")
        finally:
            self.tray_running = False
            print("Tray loop ended")

    def show_from_tray(self):
        """Показать окно из трея (при клике на иконку)"""
        print("Showing window from tray...")
        
        # Останавливаем трей
        self.tray_running = False
        
        if self.tray_icon:
            try:
                self.tray_icon.stop()
                print("Tray icon stopped")
            except Exception as e:
                print(f"Error stopping tray: {e}")
        
        # Ждем завершения потока
        if self.tray_thread and self.tray_thread.is_alive():
            try:
                self.tray_thread.join(timeout=2.0)
                print("Tray thread joined")
            except:
                print("Error joining tray thread")
        
        # Показываем окно
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()
        self.root.attributes("-topmost", True)
        self.root.after_idle(lambda: self.root.attributes("-topmost", False))
        
        print("Window shown from tray")

    def on_minimize(self, event):
        """Обработчик сворачивания окна (minimize)"""
        if event.widget == self.root:
            # Используем after для отложенного выполнения
            self.root.after(100, self.hide_to_tray)

    def toggle_connection(self):
        """Переключает состояние подключения"""
        if self.is_running:
            self.stop_tunnel()
        else:
            self.start_tunnel()

    def setup_ui(self):
        # Main frame
        main_frame = ttk.Frame(self.root, padding="10")
        main_frame.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

        # Configure grid weights
        self.root.columnconfigure(0, weight=1)
        self.root.rowconfigure(0, weight=1)
        main_frame.columnconfigure(1, weight=1)

        # Header with connection status
        header_frame = ttk.Frame(main_frame)
        header_frame.grid(
            row=0, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10)
        )

        # Connection status with background color indicator
        status_frame = ttk.Frame(header_frame)
        status_frame.pack(side=tk.LEFT)

        self.status_label = ttk.Label(
            status_frame, text="🔴 Disconnected", font=("Arial", 12, "bold")
        )
        self.status_label.pack(side=tk.LEFT, padx=5)

        ttk.Label(
            header_frame, text="SSH Tunnel Manager", font=("Arial", 14, "bold")
        ).pack(side=tk.LEFT, padx=(10, 0))

        # Auto-reconnect checkbox
        self.auto_reconnect_var = tk.BooleanVar(value=True)
        auto_reconnect_cb = ttk.Checkbutton(
            header_frame,
            text="Auto-reconnect",
            variable=self.auto_reconnect_var,
            command=self.toggle_auto_reconnect,
        )
        auto_reconnect_cb.pack(side=tk.RIGHT)

        # Restore connection checkbox
        self.restore_connection_var = tk.BooleanVar(value=True)
        restore_connection_cb = ttk.Checkbutton(
            header_frame,
            text="Restore on startup",
            variable=self.restore_connection_var,
            command=self.toggle_restore_connection,
        )
        restore_connection_cb.pack(side=tk.RIGHT, padx=(10, 0))
        
        # Инициализируем переменные состояния с корректными значениями по умолчанию
        self.auto_reconnect = True
        self.restore_connection = True

        # SSH Connection Settings
        settings_frame = ttk.LabelFrame(
            main_frame, text="SSH Connection Settings", padding="10"
        )
        settings_frame.grid(
            row=1, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10)
        )
        settings_frame.columnconfigure(1, weight=1)

        # Connection profile
        ttk.Label(settings_frame, text="Profile:").grid(
            row=0, column=0, sticky=tk.W, pady=2
        )
        self.profile_var = tk.StringVar()
        self.profile_combo = ttk.Combobox(
            settings_frame, textvariable=self.profile_var, width=28
        )
        self.profile_combo["values"] = self.get_saved_profiles()
        self.profile_combo.grid(
            row=0, column=1, sticky=(tk.W, tk.E), pady=2, padx=(5, 0)
        )
        self.profile_combo.bind("<<ComboboxSelected>>", self.on_profile_select)

        # Profile management buttons
        profile_btn_frame = ttk.Frame(settings_frame)
        profile_btn_frame.grid(row=0, column=2, padx=(5, 0))
        ttk.Button(profile_btn_frame, text="Save", command=self.save_profile).pack(
            side=tk.LEFT, padx=(0, 2)
        )
        ttk.Button(profile_btn_frame, text="Delete", command=self.delete_profile).pack(
            side=tk.LEFT
        )

        # Host
        ttk.Label(settings_frame, text="SSH Host:*").grid(
            row=1, column=0, sticky=tk.W, pady=2
        )
        self.host_entry = ttk.Entry(settings_frame, width=30)
        self.host_entry.grid(row=1, column=1, sticky=(tk.W, tk.E), pady=2, padx=(5, 0))
        self.host_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.host_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())

        # Port
        ttk.Label(settings_frame, text="SSH Port:").grid(
            row=2, column=0, sticky=tk.W, pady=2
        )
        self.port_entry = ttk.Entry(settings_frame, width=10)
        self.port_entry.insert(0, "22")
        self.port_entry.grid(row=2, column=1, sticky=tk.W, pady=2, padx=(5, 0))
        self.port_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.port_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())

        # Username
        ttk.Label(settings_frame, text="Username:*").grid(
            row=3, column=0, sticky=tk.W, pady=2
        )
        self.username_entry = ttk.Entry(settings_frame, width=30)
        self.username_entry.grid(
            row=3, column=1, sticky=(tk.W, tk.E), pady=2, padx=(5, 0)
        )
        self.username_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.username_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())

        # Authentication method
        ttk.Label(settings_frame, text="Authentication:").grid(
            row=4, column=0, sticky=tk.W, pady=2
        )
        self.auth_var = tk.StringVar(value="key")
        auth_frame = ttk.Frame(settings_frame)
        auth_frame.grid(row=4, column=1, sticky=(tk.W, tk.E), pady=2)
        ttk.Radiobutton(
            auth_frame,
            text="SSH Key",
            variable=self.auth_var,
            value="key",
            command=self.toggle_auth_method,
        ).pack(side=tk.LEFT)
        ttk.Radiobutton(
            auth_frame,
            text="Password",
            variable=self.auth_var,
            value="password",
            command=self.toggle_auth_method,
        ).pack(side=tk.LEFT, padx=(10, 0))

        # Authentication details frame
        self.auth_frame = ttk.LabelFrame(
            settings_frame, text="SSH Key Authentication", padding="5"
        )
        self.auth_frame.grid(row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=2)
        self.auth_frame.columnconfigure(1, weight=1)

        # SSH Key selection
        ttk.Label(self.auth_frame, text="SSH Key:").grid(row=0, column=0, sticky=tk.W)
        self.key_var = tk.StringVar(value="auto")
        key_frame = ttk.Frame(self.auth_frame)
        key_frame.grid(row=0, column=1, columnspan=2, sticky=(tk.W, tk.E))

        ttk.Radiobutton(
            key_frame,
            text="Auto-detect",
            variable=self.key_var,
            value="auto",
            command=self.toggle_key_selection,
        ).pack(side=tk.LEFT)
        ttk.Radiobutton(
            key_frame,
            text="Custom key",
            variable=self.key_var,
            value="custom",
            command=self.toggle_key_selection,
        ).pack(side=tk.LEFT, padx=(10, 0))

        # Custom key file
        self.key_entry_frame = ttk.Frame(self.auth_frame)
        self.key_entry_frame.grid(
            row=1, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=2
        )
        self.key_entry_frame.columnconfigure(1, weight=1)

        ttk.Label(self.key_entry_frame, text="Key File:").grid(
            row=0, column=0, sticky=tk.W
        )
        self.key_entry = ttk.Entry(self.key_entry_frame, width=40)
        self.key_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(5, 0))
        self.key_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.key_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())
        ttk.Button(
            self.key_entry_frame, text="Browse", command=self.browse_key_file
        ).grid(row=0, column=2, padx=(5, 0))
        ttk.Button(
            self.key_entry_frame, text="Detect Keys", command=self.detect_ssh_keys
        ).grid(row=0, column=3, padx=(5, 0))

        # Password entry (initially hidden)
        self.password_frame = ttk.LabelFrame(
            settings_frame, text="Password Authentication", padding="5"
        )
        self.password_frame.grid(
            row=5, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=2
        )
        self.password_frame.columnconfigure(1, weight=1)

        ttk.Label(self.password_frame, text="Password:").grid(
            row=0, column=0, sticky=tk.W
        )
        self.password_entry = ttk.Entry(self.password_frame, width=30, show="*")
        self.password_entry.grid(row=0, column=1, sticky=(tk.W, tk.E), padx=(5, 0))
        self.password_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.password_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())

        # Initially hide password frame
        self.password_frame.grid_remove()

        # Advanced options
        advanced_frame = ttk.LabelFrame(
            settings_frame, text="Advanced Options", padding="5"
        )
        advanced_frame.grid(row=6, column=0, columnspan=3, sticky=(tk.W, tk.E), pady=5)

        # Compression
        self.compression_var = tk.BooleanVar(value=True)
        compression_cb = ttk.Checkbutton(
            advanced_frame, text="Compression", variable=self.compression_var,
            command=self.on_compression_toggle
        )
        compression_cb.grid(row=0, column=0, sticky=tk.W)

        # Keepalive
        self.keepalive_var = tk.BooleanVar(value=True)
        keepalive_cb = ttk.Checkbutton(
            advanced_frame, text="Keepalive", variable=self.keepalive_var,
            command=self.on_keepalive_toggle
        )
        keepalive_cb.grid(row=0, column=1, sticky=tk.W, padx=(20, 0))

        # SOCKS Proxy Settings
        proxy_frame = ttk.LabelFrame(
            main_frame, text="SOCKS Proxy Settings", padding="10"
        )
        proxy_frame.grid(
            row=2, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 10)
        )
        proxy_frame.columnconfigure(1, weight=1)

        ttk.Label(proxy_frame, text="SOCKS Port:").grid(row=0, column=0, sticky=tk.W)
        self.socks_port_entry = ttk.Entry(proxy_frame, width=10)
        self.socks_port_entry.insert(0, "9050")
        self.socks_port_entry.grid(row=0, column=1, sticky=tk.W, padx=(5, 0))
        self.socks_port_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.socks_port_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())

        ttk.Label(proxy_frame, text="Bind Address:").grid(row=1, column=0, sticky=tk.W)
        self.bind_addr_entry = ttk.Entry(proxy_frame, width=15)
        self.bind_addr_entry.insert(0, "127.0.0.1")
        self.bind_addr_entry.grid(row=1, column=1, sticky=tk.W, padx=(5, 0))
        self.bind_addr_entry.bind('<FocusOut>', lambda e: self.save_last_settings())
        self.bind_addr_entry.bind('<KeyRelease>', lambda e: self.save_last_settings())

        # Control Buttons
        button_frame = ttk.Frame(main_frame)
        button_frame.grid(row=3, column=0, columnspan=2, pady=10)

        self.toggle_button = ttk.Button(
            button_frame, text="Start SSH Tunnel", command=self.toggle_connection
        )
        self.toggle_button.pack(side=tk.LEFT, padx=(0, 5))

        # Test Proxy button
        self.test_proxy_button = ttk.Button(
            button_frame, text="Test Proxy", command=self.test_proxy_speed
        )
        self.test_proxy_button.pack(side=tk.LEFT, padx=5)

        # Restart button for quick reconnection
        self.restart_button = ttk.Button(
            button_frame, text="Quick Restart", command=self.quick_restart
        )
        self.restart_button.pack(side=tk.LEFT, padx=5)
        self.restart_button.config(state=tk.DISABLED)  # Initially disabled

        # Кнопка скрытия в трей убрана - теперь работает автоматически при minimize

        # Progress bar for connection status
        self.progress_frame = ttk.Frame(main_frame)
        self.progress_frame.grid(row=4, column=0, columnspan=2, sticky=(tk.W, tk.E), pady=(0, 5))
        self.progress_frame.columnconfigure(0, weight=1)

        self.progress_bar = ttk.Progressbar(
            self.progress_frame,
            mode='indeterminate',
            length=200
        )
        self.progress_bar.grid(row=0, column=0, sticky=(tk.W, tk.E), padx=5)
        self.progress_frame.grid_remove()  # Initially hidden

        self.progress_label = ttk.Label(
            self.progress_frame,
            text="Connecting..."
        )
        self.progress_label.grid(row=1, column=0)

        # Log output
        log_frame = ttk.LabelFrame(main_frame, text="Connection Log", padding="10")
        log_frame.grid(
            row=5, column=0, columnspan=2, sticky=(tk.W, tk.E, tk.N, tk.S), pady=(0, 10)
        )
        log_frame.columnconfigure(0, weight=1)
        log_frame.rowconfigure(0, weight=1)
        main_frame.rowconfigure(5, weight=1)

        self.log_text = scrolledtext.ScrolledText(
            log_frame, height=12, width=70, font=("Monospace", 9)
        )
        self.log_text.grid(row=0, column=0, sticky=(tk.W, tk.E, tk.N, tk.S))

    def toggle_auto_reconnect(self):
        self.auto_reconnect = self.auto_reconnect_var.get()
        if self.auto_reconnect:
            self.log_message("🔄 Auto-reconnect enabled")
        else:
            self.log_message("📴 Auto-reconnect disabled")
        
        # Сохраняем настройки при изменении автопереподключения
        self.save_last_settings()

    def toggle_restore_connection(self):
        """Обработчик изменения состояния Restore on startup"""
        self.restore_connection = self.restore_connection_var.get()
        
        if self.restore_connection:
            self.log_message("🔄 Restore connection on startup enabled")
        else:
            self.log_message("📴 Restore connection on startup disabled")
        
        # Сохраняем настройки при изменении
        self.save_last_settings()

    def toggle_auth_method(self):
        if self.auth_var.get() == "password":
            self.password_frame.grid()
            self.auth_frame.grid_remove()
        else:
            self.password_frame.grid_remove()
            self.auth_frame.grid()
            self.toggle_key_selection()
        
        # Сохраняем настройки при изменении метода аутентификации
        self.save_last_settings()

    def toggle_key_selection(self):
        if self.key_var.get() == "auto":
            self.key_entry_frame.grid_remove()
        else:
            self.key_entry_frame.grid()
        
        # Сохраняем настройки при изменении выбора ключа
        self.save_last_settings()

    def on_compression_toggle(self):
        """Обработчик изменения состояния Compression"""
        self.save_last_settings()
        # Логируем изменение
        if self.compression_var.get():
            self.log_message("Compression enabled")
        else:
            self.log_message("Compression disabled")

    def on_keepalive_toggle(self):
        """Обработчик изменения состояния Keepalive"""
        self.save_last_settings()
        # Логируем изменение
        if self.keepalive_var.get():
            self.log_message("Keepalive enabled")
        else:
            self.log_message("Keepalive disabled")

    def detect_ssh_keys(self):
        """Обнаруживает SSH ключи в ~/.ssh/"""
        ssh_dir = Path.home() / ".ssh"
        keys = []

        if ssh_dir.exists():
            for key_file in ssh_dir.glob("*"):
                if key_file.is_file() and key_file.suffix in ["", ".pem"]:
                    try:
                        content = key_file.read_text()
                        if "PRIVATE KEY" in content:
                            keys.append(str(key_file))
                    except:
                        pass

        if keys:
            key_list = "\n".join([f"  • {k}" for k in keys])
            self.log_message(f"Found SSH keys:\n{key_list}")
        else:
            self.log_message("No SSH keys found in ~/.ssh/")

    def get_system_ssh_key(self):
        """Пытается найти подходящий SSH ключ автоматически"""
        ssh_dir = Path.home() / ".ssh"
        common_keys = ["id_rsa", "id_ed25519", "id_ecdsa", "id_dsa"]

        for key_name in common_keys:
            key_path = ssh_dir / key_name
            if key_path.exists():
                return str(key_path)

        return None

    def browse_key_file(self):
        from tkinter import filedialog

        filename = filedialog.askopenfilename(
            title="Select SSH Key File",
            initialdir=str(Path.home() / ".ssh"),
            filetypes=[("SSH Key files", "*"), ("All files", "*.*")],
        )
        if filename:
            self.key_entry.delete(0, tk.END)
            self.key_entry.insert(0, filename)

    def get_saved_profiles(self):
        """Возвращает список сохраненных профилей"""
        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    return list(config.get("profiles", {}).keys())
            except:
                pass
        return []

    def save_profile(self):
        profile_name = self.profile_var.get().strip()
        if not profile_name:
            messagebox.showerror("Error", "Please enter a profile name")
            return

        config = {}
        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
            except:
                pass

        if "profiles" not in config:
            config["profiles"] = {}

        config["profiles"][profile_name] = {
            "host": self.host_entry.get().strip(),
            "port": self.port_entry.get().strip(),
            "username": self.username_entry.get().strip(),
            "auth_method": self.auth_var.get(),
            "key_type": self.key_var.get(),
            "key_file": self.key_entry.get().strip(),
            "socks_port": self.socks_port_entry.get().strip(),
            "bind_addr": self.bind_addr_entry.get().strip(),
            "compression": self.compression_var.get(),
            "keepalive": self.keepalive_var.get(),
            "auto_reconnect": self.auto_reconnect_var.get(),
        }

        try:
            with open(self.config_file, "w") as f:
                json.dump(config, f, indent=2)

            self.profile_combo["values"] = self.get_saved_profiles()
            messagebox.showinfo("Success", f"Profile '{profile_name}' saved")
        except Exception as e:
            messagebox.showerror("Error", f"Failed to save profile: {e}")

    def on_profile_select(self, event):
        profile_name = self.profile_var.get()
        if not profile_name:
            return

        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    profile = config.get("profiles", {}).get(profile_name)
                    if profile:
                        self.host_entry.delete(0, tk.END)
                        self.host_entry.insert(0, profile.get("host", ""))

                        self.port_entry.delete(0, tk.END)
                        self.port_entry.insert(0, profile.get("port", "22"))

                        self.username_entry.delete(0, tk.END)
                        self.username_entry.insert(0, profile.get("username", ""))

                        self.auth_var.set(profile.get("auth_method", "key"))
                        self.key_var.set(profile.get("key_type", "auto"))
                        self.key_entry.delete(0, tk.END)
                        self.key_entry.insert(0, profile.get("key_file", ""))

                        self.socks_port_entry.delete(0, tk.END)
                        self.socks_port_entry.insert(
                            0, profile.get("socks_port", "9050")
                        )

                        self.bind_addr_entry.delete(0, tk.END)
                        self.bind_addr_entry.insert(
                            0, profile.get("bind_addr", "127.0.0.1")
                        )

                        self.compression_var.set(profile.get("compression", True))
                        self.keepalive_var.set(profile.get("keepalive", True))
                        self.auto_reconnect_var.set(profile.get("auto_reconnect", True))
                        self.restore_connection_var.set(profile.get("restore_connection", True))

                        self.toggle_auth_method()
                        
                        # Обновляем переменные состояния
                        self.auto_reconnect = self.auto_reconnect_var.get()
                        self.restore_connection = self.restore_connection_var.get()
                        
                        # Сохраняем настройки после загрузки профиля
                        self.save_last_settings()
            except Exception as e:
                messagebox.showerror("Error", f"Failed to load profile: {e}")

    def delete_profile(self):
        profile_name = self.profile_var.get()
        if not profile_name:
            return

        if messagebox.askyesno("Confirm", f"Delete profile '{profile_name}'?"):
            if self.config_file.exists():
                try:
                    with open(self.config_file, "r") as f:
                        config = json.load(f)

                    if profile_name in config.get("profiles", {}):
                        del config["profiles"][profile_name]

                        with open(self.config_file, "w") as f:
                            json.dump(config, f, indent=2)

                        self.profile_combo.set("")
                        self.profile_combo["values"] = self.get_saved_profiles()
                        messagebox.showinfo(
                            "Success", f"Profile '{profile_name}' deleted"
                        )
                except Exception as e:
                    messagebox.showerror("Error", f"Failed to delete profile: {e}")

    def load_config(self):
        """Загружает последние настройки"""
        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)

                last_settings = config.get("last_settings", {})
                if last_settings:
                    # Сначала загружаем профиль если он есть
                    active_profile = last_settings.get("active_profile", "")
                    if active_profile and active_profile in self.get_saved_profiles():
                        self.profile_var.set(active_profile)
                        self.on_profile_select(None)  # Загружаем профиль
                    else:
                        # Если профиля нет, загружаем индивидуальные настройки
                        self.load_connection_settings(last_settings)
            except Exception as e:
                print(f"Error loading config: {e}")
                pass

    def load_connection_settings(self, settings):
        """Загружает настройки подключения из словаря"""
        try:
            self.log_message("📥 Loading connection settings...")
            
            # Очищаем поля перед загрузкой
            self.host_entry.delete(0, tk.END)
            self.port_entry.delete(0, tk.END)
            self.username_entry.delete(0, tk.END)
            self.socks_port_entry.delete(0, tk.END)
            self.bind_addr_entry.delete(0, tk.END)
            self.key_entry.delete(0, tk.END)
            
            # Загружаем основные настройки
            host = settings.get("host", "")
            port = settings.get("port", "22")
            username = settings.get("username", "")
            socks_port = settings.get("socks_port", "9050")
            bind_addr = settings.get("bind_addr", "127.0.0.1")
            key_file = settings.get("key_file", "")
            
            self.host_entry.insert(0, host)
            self.port_entry.insert(0, port)
            self.username_entry.insert(0, username)
            self.socks_port_entry.insert(0, socks_port)
            self.bind_addr_entry.insert(0, bind_addr)
            self.key_entry.insert(0, key_file)
            
            # Загружаем булевы настройки
            compression = settings.get("compression", True)
            keepalive = settings.get("keepalive", True)
            auth_method = settings.get("auth_method", "key")
            key_type = settings.get("key_type", "auto")
            auto_reconnect = settings.get("auto_reconnect", True)
            restore_connection = settings.get("restore_connection", True)
            
            self.compression_var.set(compression)
            self.keepalive_var.set(keepalive)
            self.auth_var.set(auth_method)
            self.key_var.set(key_type)
            self.auto_reconnect_var.set(auto_reconnect)
            self.restore_connection_var.set(restore_connection)
            
            # Обновляем переменные состояния
            self.auto_reconnect = auto_reconnect
            self.restore_connection = restore_connection
            
            # Применяем метод аутентификации
            self.toggle_auth_method()
            
            self.log_message(f"   ✓ Host: {host}")
            self.log_message(f"   ✓ Username: {username}")
            self.log_message(f"   ✓ Auth: {auth_method}")
            self.log_message(f"   ✓ Auto-reconnect: {auto_reconnect}")
            self.log_message(f"   ✓ Restore: {restore_connection}")
            self.log_message("📥 Connection settings loaded successfully")
            
        except Exception as e:
            print(f"Error loading connection settings: {e}")
            self.log_message(f"⚠️  Error loading connection settings: {e}")

    def save_connection_state(self, was_connected):
        """Специальная функция для сохранения состояния подключения"""
        try:
            config = {}
            if self.config_file.exists():
                with open(self.config_file, "r") as f:
                    config = json.load(f)
            
            if "last_settings" not in config:
                config["last_settings"] = {}
            
            # Обновляем только состояние подключения
            config["last_settings"]["was_connected"] = was_connected
            config["last_settings"]["timestamp"] = time.time()
            
            with open(self.config_file, "w") as f:
                json.dump(config, f, indent=2)
            
            print(f"💾 SAVED: was_connected = {was_connected}")
            
        except Exception as e:
            print(f"❌ Error saving connection state: {e}")

    def save_last_settings(self):
        """Сохраняет текущие настройки как последние использованные"""
        config = {}
        if self.config_file.exists():
            try:
                with open(self.config_file, "r") as f:
                    config = json.load(f)
            except:
                pass

        # Получаем сохраненное состояние подключения, если оно есть
        saved_was_connected = config.get("last_settings", {}).get("was_connected", False)
        
        config["last_settings"] = {
            "host": self.host_entry.get().strip(),
            "port": self.port_entry.get().strip(),
            "username": self.username_entry.get().strip(),
            "socks_port": self.socks_port_entry.get().strip(),
            "bind_addr": self.bind_addr_entry.get().strip(),
            "compression": self.compression_var.get(),
            "keepalive": self.keepalive_var.get(),
            "auth_method": self.auth_var.get(),
            "key_type": self.key_var.get(),
            "key_file": self.key_entry.get().strip(),
            "active_profile": self.profile_var.get().strip(),
            "auto_reconnect": self.auto_reconnect_var.get(),
            "restore_connection": self.restore_connection_var.get(),
            "was_connected": saved_was_connected,  # Сохраняем СОХРАНЕННОЕ состояние подключения
            "timestamp": time.time(),  # Добавляем timestamp для отслеживания
        }

        try:
            with open(self.config_file, "w") as f:
                json.dump(config, f, indent=2)
        except Exception as e:
            print(f"Error saving settings: {e}")
            pass

    def log_message(self, message):
        timestamp = time.strftime("%H:%M:%S")
        self.log_text.insert(tk.END, f"[{timestamp}] {message}\n")
        self.log_text.see(tk.END)
        self.root.update_idletasks()

    def show_progress(self, message="Connecting..."):
        """Показывает индикатор прогресса"""
        self.progress_label.config(text=message)
        self.progress_frame.grid()
        self.progress_bar.start(10)  # Скорость анимации

    def hide_progress(self):
        """Скрывает индикатор прогресса"""
        self.progress_bar.stop()
        self.progress_frame.grid_remove()

    def update_status(self, message, is_connected=False):
        if is_connected:
            self.status_label.config(text="🟢 Connected - " + message)
            self.hide_progress()
        else:
            # Add visual indicator for different states
            if 'reconnecting' in message.lower():
                self.status_label.config(text="🔄 " + message)
            elif 'waiting' in message.lower() or 'network' in message.lower():
                self.status_label.config(text="⏳ " + message)
            elif 'restarting' in message.lower():
                self.status_label.config(text="🔄 " + message)
            else:
                self.status_label.config(text="🔴 " + message)

            # Показываем прогресс только для определенных статусов
            if any(keyword in message.lower() for keyword in ['connecting', 'reconnecting', 'waiting', 'restarting']):
                self.show_progress(message)
            else:
                self.hide_progress()

        # Обновляем иконку в трее
        self.update_tray_icon(is_connected)
        self.root.update_idletasks()

    def start_tunnel(self):
        if self.is_running:
            self.log_message("Tunnel is already running")
            return

        host = self.host_entry.get().strip()
        port = self.port_entry.get().strip()
        username = self.username_entry.get().strip()
        socks_port = self.socks_port_entry.get().strip()
        bind_addr = self.bind_addr_entry.get().strip()

        if not host or not username:
            messagebox.showerror(
                "Error", "Please fill in all required fields (Host and Username)"
            )
            return

        # Сохраняем настройки
        self.save_last_settings()

        # Reset reconnect attempts
        self.reconnect_attempts = 0

        # Логируем начало подключения
        if self.restore_connection and self.auto_reconnect:
            self.log_message("Starting SSH tunnel (restore mode enabled)")
        else:
            self.log_message("Starting SSH tunnel")

        # Запускаем туннель в отдельном потоке
        thread = threading.Thread(target=self.run_tunnel_loop, daemon=True)
        thread.start()
        
        # НЕМЕДЛЕННО сохраняем состояние "подключение началось"
        self.save_connection_state(True)

    def run_tunnel_loop(self):
        """Основной цикл туннеля с автореконнектом"""
        while self.reconnect_attempts < self.max_reconnect_attempts:
            if self.reconnect_attempts > 0:
                # Улучшенное сообщение с прогрессом
                self.log_message(
                    f"🔄 Reconnection attempt {self.reconnect_attempts}/{self.max_reconnect_attempts} "
                    f"(waiting {self.reconnect_delay}s...)"
                )
                self.root.after(
                    0, lambda a=self.reconnect_attempts, m=self.max_reconnect_attempts:
                    self.update_status(f"Reconnecting ({a}/{m})...", False)
                )
                time.sleep(self.reconnect_delay)

            # Проверяем доступность сети перед попыткой подключения
            if not self.is_network_available():
                self.log_message("⚠️  Network unavailable, retrying in 2s...")
                self.root.after(
                    0, lambda: self.update_status("Waiting for network...", False)
                )
                # Используем уменьшенную задержку для более быстрых попыток
                time.sleep(2)
                continue

            self.run_single_tunnel()

            # FIXED: Check if connection dropped and auto-reconnect is enabled
            # After run_single_tunnel, is_running will be False if connection was lost
            if not self.is_running and self.auto_reconnect:
                self.reconnect_attempts += 1
                self.log_message(f"🔌 Connection lost, attempting to reconnect... ({self.reconnect_attempts}/{self.max_reconnect_attempts})")
                # Continue to next iteration
            else:
                # Either user manually stopped or auto-reconnect is disabled
                break

        if self.reconnect_attempts >= self.max_reconnect_attempts:
            self.log_message("❌ Max reconnection attempts reached")
            self.root.after(
                0, lambda: self.update_status("Max reconnect attempts reached", False)
            )

    def is_network_available(self, timeout=1):
        """Проверяет доступность сетевого подключения (оптимизировано для скорости)"""
        try:
            # Быстрая проверка через socket connection (намного быстрее ping)
            import socket

            # Пробуем подключиться к надежным DNS серверам
            test_servers = [
                ("8.8.8.8", 53),       # Google DNS
                ("1.1.1.1", 53),       # Cloudflare DNS
                ("208.67.222.222", 53) # OpenDNS
            ]

            for server, port in test_servers:
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(timeout)
                    result = sock.connect_ex((server, port))
                    sock.close()
                    if result == 0:
                        return True
                except (socket.error, socket.timeout):
                    continue

            # Fallback: попробуем проверить SSH сервер напрямую, если настройки заполнены
            try:
                host = self.host_entry.get().strip()
                port = int(self.port_entry.get().strip())
                if host and port:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(timeout)
                    result = sock.connect_ex((host, port))
                    sock.close()
                    return result == 0
            except (ValueError, socket.error, socket.timeout):
                pass

            return False
        except Exception as e:
            print(f"Network check error: {e}")
            return False

    def run_single_tunnel(self):
        """Запускает один экземпляр SSH туннеля"""
        try:
            self.is_running = True
            self.root.after(0, self.on_tunnel_started)

            host = self.host_entry.get().strip()
            port = self.port_entry.get().strip()
            username = self.username_entry.get().strip()
            socks_port = self.socks_port_entry.get().strip()
            bind_addr = self.bind_addr_entry.get().strip()

            # Build SSH command
            ssh_cmd = [
                "ssh",
                "-D",
                f"{bind_addr}:{socks_port}",
                "-N",  # No remote command
                "-p",
                port,
                f"{username}@{host}",
            ]

            # Добавляем аутентификацию
            if self.auth_var.get() == "password":
                # Для аутентификации по паролю
                pass
            else:
                # Для аутентификации по ключу
                if self.key_var.get() == "auto":
                    key_file = self.get_system_ssh_key()
                    if key_file:
                        ssh_cmd.extend(["-i", key_file])
                        self.log_message(f"Using auto-detected key: {key_file}")
                else:
                    key_file = self.key_entry.get().strip()
                    if key_file and os.path.exists(key_file):
                        ssh_cmd.extend(["-i", key_file])
                    else:
                        self.log_message("Error: SSH key file not found")
                        return

            # Advanced options
            if self.compression_var.get():
                ssh_cmd.extend(["-C"])

            if self.keepalive_var.get():
                ssh_cmd.extend(
                    [
                        "-o",
                        "ServerAliveInterval=60",
                        "-o",
                        "ServerAliveCountMax=3",
                        "-o",
                        "TCPKeepAlive=yes",
                    ]
                )

            # Common options
            ssh_cmd.extend(
                [
                    "-o",
                    "StrictHostKeyChecking=accept-new",
                    "-o",
                    "ConnectTimeout=30",
                    "-v",  # Verbose logging
                ]
            )

            self.log_message(f"Starting SSH tunnel: {' '.join(ssh_cmd)}")
            self.root.after(0, lambda: self.update_status("Connecting...", False))

            # Запускаем процесс
            if self.auth_var.get() == "password":
                password = self.password_entry.get()
                self.ssh_process = subprocess.Popen(
                    ssh_cmd,
                    stdin=subprocess.PIPE,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    universal_newlines=True,
                )

                if password:
                    self.ssh_process.stdin.write(password + "\n")
                    self.ssh_process.stdin.flush()
            else:
                self.ssh_process = subprocess.Popen(
                    ssh_cmd,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    universal_newlines=True,
                )

            self.log_message("SSH tunnel process started")
            self.root.after(0, lambda: self.update_status(f"Connected to {host}", True))

            # Читаем вывод в реальном времени
            while self.is_running and self.ssh_process.poll() is None:
                line = self.ssh_process.stderr.readline()
                if line:
                    line = line.strip()
                    if line:
                        self.log_message(f"SSH: {line}")
                        # Фильтруем spam сообщения "No route to host"
                        if "No route to host" in line:
                            continue

            # Process exited
            return_code = self.ssh_process.wait()
            if return_code != 0 and self.is_running:
                self.log_message(f"SSH tunnel exited with code: {return_code}")
            elif self.is_running:
                self.log_message("SSH tunnel stopped unexpectedly")

        except Exception as e:
            self.log_message(f"Error in SSH tunnel: {str(e)}")
        finally:
            self.is_running = False
            self.root.after(0, self.on_tunnel_stopped)

    def stop_tunnel(self):
        if self.ssh_process and self.is_running:
            self.log_message("Stopping SSH tunnel...")
            was_running = self.is_running
            self.is_running = False

            # Prevent auto-reconnect when user manually stops
            # Set reconnect attempts to max to exit the loop
            self.reconnect_attempts = self.max_reconnect_attempts

            self.ssh_process.terminate()

            try:
                self.ssh_process.wait(timeout=5)
                self.log_message("SSH tunnel stopped")
            except subprocess.TimeoutExpired:
                self.ssh_process.kill()
                self.log_message("SSH tunnel forcefully terminated")

            # НЕ сохраняем состояние здесь, чтобы не перезаписать при закрытии приложения

    def on_tunnel_started(self):
        self.toggle_button.config(text="Stop SSH Tunnel")
        self.restart_button.config(state=tk.NORMAL)
        self.update_status("Connected", True)
        # Сохраняем состояние подключения при успешном запуске
        self.save_connection_state(True)

    def on_tunnel_stopped(self):
        self.toggle_button.config(text="Start SSH Tunnel")
        self.restart_button.config(state=tk.DISABLED)
        self.update_status("Disconnected", False)
        # Сохраняем состояние отключения при остановке
        self.save_last_settings()

    def quick_restart(self):
        """Быстрый перезапуск туннеля без задержки"""
        if not self.is_running:
            self.log_message("⚠️  Tunnel is not running")
            return

        self.log_message("🔄 Quick restart initiated...")
        self.update_status("Restarting...", False)

        # Останавливаем туннель
        self.stop_tunnel()

        # Ждем немного для корректного завершения
        # Уменьшаем задержку для более быстрого перезапуска
        time.sleep(0.3)

        # Запускаем заново
        self.log_message("🚀 Restarting tunnel...")
        self.start_tunnel()

    def test_proxy_speed(self):
        """Тестирует скорость и доступность прокси"""
        if not self.is_running:
            messagebox.showwarning(
                "Not Connected",
                "Please start the SSH tunnel first before testing"
            )
            return

        self.log_message("🧪 Starting proxy speed test...")
        self.test_proxy_button.config(state=tk.DISABLED, text="Testing...")

        # Запускаем тест в отдельном потоке
        thread = threading.Thread(target=self.run_proxy_test, daemon=True)
        thread.start()

    def run_proxy_test(self):
        """Выполняет тест прокси в отдельном потоке"""
        try:
            socks_port = self.socks_port_entry.get().strip()
            bind_addr = self.bind_addr_entry.get().strip()
            proxy_url = f"socks5://{bind_addr}:{socks_port}"

            # Тест 1: Проверка подключения
            self.root.after(0, lambda: self.log_message("📡 Test 1/3: Testing connectivity..."))
            connectivity_result = self.test_proxy_connectivity(proxy_url)

            if not connectivity_result["success"]:
                self.root.after(0, lambda: self.log_message(
                    f"❌ Connectivity test failed: {connectivity_result['error']}"
                ))
                return

            self.root.after(0, lambda: self.log_message(
                f"✅ Connectivity: OK ({connectivity_result['time']:.2f}s)"
            ))

            # Тест 2: Проверка латентности
            self.root.after(0, lambda: self.log_message("⏱️  Test 2/3: Testing latency..."))
            latency_result = self.test_proxy_latency(proxy_url)

            self.root.after(0, lambda: self.log_message(
                f"✅ Latency: {latency_result['avg']:.0f}ms (min: {latency_result['min']:.0f}ms, max: {latency_result['max']:.0f}ms)"
            ))

            # Тест 3: Проверка скорости
            self.root.after(0, lambda: self.log_message("🚀 Test 3/3: Testing download speed..."))
            speed_result = self.test_proxy_download_speed(proxy_url)

            if speed_result["success"]:
                speed_mbps = speed_result['speed_mbps']
                self.root.after(0, lambda: self.log_message(
                    f"✅ Download speed: {speed_mbps:.2f} Mbps"
                ))
            else:
                self.root.after(0, lambda: self.log_message(
                    f"⚠️  Speed test: {speed_result['error']}"
                ))

            # Итоговый результат
            self.root.after(0, lambda: self.log_message("=" * 60))
            self.root.after(0, lambda: self.log_message("📊 PROXY TEST RESULTS:"))
            self.root.after(0, lambda: self.log_message(f"   Connectivity: ✅ OK"))
            self.root.after(0, lambda: self.log_message(f"   Latency: {latency_result['avg']:.0f}ms"))
            if speed_result["success"]:
                self.root.after(0, lambda: self.log_message(f"   Download Speed: {speed_result['speed_mbps']:.2f} Mbps"))
            self.root.after(0, lambda: self.log_message("=" * 60))

        except Exception as e:
            self.root.after(0, lambda: self.log_message(f"❌ Test error: {str(e)}"))
        finally:
            self.root.after(0, lambda: self.test_proxy_button.config(
                state=tk.NORMAL, text="Test Proxy"
            ))

    def test_proxy_connectivity(self, proxy_url):
        """Тестирует базовое подключение через прокси"""
        import socket
        import time

        try:
            start_time = time.time()

            # Пытаемся подключиться к прокси напрямую
            socks_port = int(self.socks_port_entry.get().strip())
            bind_addr = self.bind_addr_entry.get().strip()

            sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            sock.settimeout(5)
            result = sock.connect_ex((bind_addr, socks_port))
            sock.close()

            elapsed = time.time() - start_time

            if result == 0:
                return {"success": True, "time": elapsed}
            else:
                return {"success": False, "error": f"Cannot connect to SOCKS proxy", "time": elapsed}

        except Exception as e:
            return {"success": False, "error": str(e), "time": 0}

    def test_proxy_latency(self, proxy_url):
        """Тестирует латентность через прокси"""
        import socket
        import time

        try:
            socks_port = int(self.socks_port_entry.get().strip())
            bind_addr = self.bind_addr_entry.get().strip()

            latencies = []
            attempts = 5

            for i in range(attempts):
                start_time = time.time()
                try:
                    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                    sock.settimeout(2)
                    sock.connect((bind_addr, socks_port))
                    sock.close()
                    latency_ms = (time.time() - start_time) * 1000
                    latencies.append(latency_ms)
                except:
                    pass
                time.sleep(0.1)

            if latencies:
                return {
                    "min": min(latencies),
                    "max": max(latencies),
                    "avg": sum(latencies) / len(latencies)
                }
            else:
                return {"min": 0, "max": 0, "avg": 0}

        except Exception as e:
            return {"min": 0, "max": 0, "avg": 0}

    def test_proxy_download_speed(self, proxy_url):
        """Тестирует скорость загрузки через прокси"""
        try:
            # Пытаемся использовать requests с SOCKS прокси
            try:
                import requests
                from urllib.request import urlopen
                import time

                # Используем небольшой файл для теста
                test_url = "https://httpbin.org/bytes/1048576"  # 1MB тестовый файл

                # Настраиваем прокси для requests
                socks_port = self.socks_port_entry.get().strip()
                bind_addr = self.bind_addr_entry.get().strip()
                proxies = {
                    'http': f'socks5://{bind_addr}:{socks_port}',
                    'https': f'socks5://{bind_addr}:{socks_port}'
                }

                start_time = time.time()
                response = requests.get(test_url, proxies=proxies, timeout=10)
                elapsed = time.time() - start_time

                bytes_downloaded = len(response.content)
                speed_bps = bytes_downloaded / elapsed
                speed_mbps = (speed_bps * 8) / (1024 * 1024)

                return {
                    "success": True,
                    "speed_mbps": speed_mbps,
                    "bytes": bytes_downloaded,
                    "time": elapsed
                }

            except ImportError:
                return {
                    "success": False,
                    "error": "requests library not available (install: pip install requests[socks])"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"Download test failed: {str(e)}"
                }

        except Exception as e:
            return {"success": False, "error": str(e)}

    def signal_handler(self, signum, frame):
        """Обработчик сигналов для graceful shutdown"""
        self.log_message("Received shutdown signal, stopping tunnel...")
        
        # Сохраняем состояние перед закрытием
        was_connected = self.is_running
        self.save_connection_state(was_connected)
        
        self.stop_tunnel()
        if self.tray_icon and self.tray_running:
            self.tray_icon.stop()
        self.root.quit()

    def check_restore_connection(self):
        """Проверяет и восстанавливает подключение при запуске"""
        try:
            if self.config_file.exists():
                with open(self.config_file, "r") as f:
                    config = json.load(f)
                    
                last_settings = config.get("last_settings", {})
                was_connected = last_settings.get("was_connected", False)
                restore_connection = last_settings.get("restore_connection", True)
                
                # Обновляем переменные состояния из сохраненных настроек
                if "restore_connection" in last_settings:
                    self.restore_connection = restore_connection
                    self.restore_connection_var.set(restore_connection)
                
                if "auto_reconnect" in last_settings:
                    self.auto_reconnect = last_settings.get("auto_reconnect", True)
                    self.auto_reconnect_var.set(self.auto_reconnect)
                
                # Восстанавливаем состояние подключения
                if was_connected:
                    print(f"🔍 RESTORE CHECK: Connection was previously active")
                
                self.log_message(f"🔍 Restore check: was_connected={was_connected}, restore={restore_connection}")
                
                if was_connected and restore_connection:
                    # Проверяем, что настройки подключения есть
                    host = last_settings.get("host", "").strip()
                    username = last_settings.get("username", "").strip()
                    
                    print(f"🔍 RESTORE CHECK: host = '{host}', username = '{username}'")
                    
                    if host and username:
                        self.log_message("🔄 Previous connection found - restoring...")
                        self.log_message(f"   Host: {host}, Username: {username}")
                        
                        # Загружаем настройки из сохраненного состояния
                        self.load_connection_settings(last_settings)

                        # Запускаем подключение с минимальной задержкой для быстрого восстановления
                        self.root.after(300, self.start_tunnel)
                        self.log_message("   Connection will be restored in 0.3 seconds")
                    else:
                        self.log_message("⚠️  Previous connection was active but settings incomplete")
                        print(f"🔍 RESTORE CHECK: Settings incomplete - host='{host}', username='{username}'")
                elif was_connected and not restore_connection:
                    self.log_message("📴 Previous connection was active but restore is disabled")
                else:
                    self.log_message("💤 No active connection to restore")
                    print(f"🔍 RESTORE CHECK: No restore needed - was_connected={was_connected}, restore={restore_connection}")
            else:
                self.log_message("💤 No config file found - fresh start")
                print(f"🔍 RESTORE CHECK: No config file found")
        except Exception as e:
            print(f"❌ Error checking restore connection: {e}")
            self.log_message(f"⚠️  Error checking restore connection: {e}")

    def cleanup_and_quit(self):
        """Очистка и выход"""
        # КРИТИЧЕСКИ ВАЖНО: Сохраняем состояние ДО остановки туннеля
        was_connected = self.is_running
        print(f"CLOSING: was_connected = {was_connected}")
        
        # Принудительно сохраняем состояние подключения
        self.save_connection_state(was_connected)
        
        if was_connected:
            self.log_message("SAVING: Connection was active - will restore on next startup")
        else:
            self.log_message("SAVING: Connection was not active")
        
        self.stop_tunnel()
        
        # Останавливаем трей
        if self.tray_running:
            self.tray_running = False
            if self.tray_icon:
                try:
                    self.tray_icon.stop()
                except:
                    pass
            
            # Ждем завершения потока трея
            if self.tray_thread and self.tray_thread.is_alive():
                try:
                    self.tray_thread.join(timeout=2.0)
                except:
                    pass
        
        self.log_message("Application closed")
        self.root.quit()
        self.root.destroy()


def main():
    import argparse
    
    # Проверяем зависимости
    try:
        import pystray
        from PIL import Image
    except ImportError:
        print("Please install required dependencies:")
        print("pip install pystray pillow")
        sys.exit(1)

    parser = argparse.ArgumentParser(description="SSH Tunnel Manager")
    parser.add_argument('--start-minimized', action='store_true', 
                       help='Запустить свёрнутым в трей (по умолчанию)')
    parser.add_argument('--no-minimize', action='store_true', 
                       help='Запустить с видимым окном')
    
    args = parser.parse_args()
    
    # По умолчанию запускаем свёрнутым в трей, если не указан флаг --no-minimize
    start_minimized = not args.no_minimize
    
    root = tk.Tk()
    app = SSHTunnelApp(root, start_minimized=start_minimized)

    try:
        root.mainloop()
    except KeyboardInterrupt:
        app.cleanup_and_quit()


if __name__ == "__main__":
    main()
