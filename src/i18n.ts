import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-localstorage-backend';

// 导入翻译文件
import enTranslation from './locales/en/translation.json';
import zhTranslation from './locales/zh/translation.json';
import jaTranslation from './locales/ja/translation.json';
import krKimTranslation from './locales/kr_Kim/translation.json';

// 定义资源对象
const resources = {
  en: {
    translation: enTranslation
  },
  zh: {
    translation: zhTranslation
  },
  ja: {
    translation: jaTranslation
  },
  kr_Kim: {
    translation: krKimTranslation
  }
};

// 语言检测选项
const languageDetectorOptions = {
  // 自定义语言检测顺序
  order: ['localStorage', 'navigator'],
  
  // 缓存用户选择的语言到localStorage
  caches: ['localStorage'],
  
  // 当检测到受支持的语言时才使用
  checkWhitelist: true
};

// i18n配置
i18n
  .use(Backend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en', // 默认语言
    supportedLngs: ['en', 'zh', 'ja', 'kr_Kim'], // 支持的语言列表
    
    // 语言检测配置
    detection: languageDetectorOptions,
    
    // 默认命名空间
    defaultNS: 'translation',
    
    interpolation: {
      escapeValue: false // React已经安全处理了
    },
    
    // 调试模式
    debug: false
  });

// 自动检测浏览器语言并设置优先级
const detectBrowserLanguage = () => {
  const browserLang = navigator.language || (navigator as any).userLanguage;
  const supportedLangs = ['en', 'zh', 'ja', 'kr_Kim'];
  
  // 根据用户指定的优先级排序：en > zh > ja > kr_Kim
  const priorityLangs = ['en', 'zh', 'ja', 'kr_Kim'];
  
  // 首先检查浏览器语言是否在支持列表中
  if (supportedLangs.includes(browserLang)) {
    return browserLang;
  }
  
  // 检查浏览器语言的前缀是否匹配（例如zh-CN匹配zh）
  const langPrefix = browserLang.split('-')[0];
  if (supportedLangs.includes(langPrefix)) {
    return langPrefix;
  }
  
  // 返回优先级最高的可用语言
  return priorityLangs.find(lang => supportedLangs.includes(lang)) || 'en';
};

// 初始化时设置语言
i18n.on('initialized', () => {
  // 如果没有已存储的语言设置，则根据浏览器语言设置
  if (!i18n.language || i18n.language === 'cimode') {
    const detectedLang = detectBrowserLanguage();
    i18n.changeLanguage(detectedLang);
  }
});

// 导出语言检测函数以便在应用中使用
export { detectBrowserLanguage };

export default i18n;