module.exports = {  
  /*"installedPackages":{  
     "xmlName":"InstalledPackage",
     "label":"",
     "label_ja":"",
     "children":{  
     }
  },*/
  "labels":{  
     "xmlName":"CustomLabels",
     "label":"Custom Label",
     "label_ja":"カスタムラベル",
     "children":{  
        "CustomLabels":"CustomLabel"
     }
  },
  "staticresources":{  
     "xmlName":"StaticResource",
     "label":"Static Resource",
     "label_ja":"静的リソース",
     "children":{  

     }
  },
  "scontrols":{  
     "xmlName":"Scontrol",
     "label":"S-Control",
     "label_ja":"Sコントロール",
     "children":{  

     }
  },
  "components":{  
     "xmlName":"ApexComponent",
     "label":"Visualforce Component",
     "label_ja":"Visualforce コンポーネント",
     "children":{  

     }
  },
  "customMetadata":{
     "xmlName":"CustomMetadata",
     "label":"Custom Metadata Type",
     "label_ja":"カスタムメタデータ型",
     "children":{  

     }
  },
  "globalValueSets":{
     "xmlName":"GlobalValueSet",
     "label":"Global Value Set",
     "label_ja":"グローバル値セット",
     "children":{  

     }
  },
  "globalValueSetTranslations":{
     "xmlName":"GlobalValueSetTranslation",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "standardValueSets":{
     "xmlName":"StandardValueSet",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "pages":{  
     "xmlName":"ApexPage",
     "label":"Visualforce Page",
     "label_ja":"Visualforce ページ",
     "children":{  

     }
  },
  "queues":{  
     "xmlName":"Queue",
     "label":"Queue",
     "label_ja":"キュー",
     "children":{  

     }
  },
  "objects":{  
     "xmlName":"CustomObject",
     "label":"Custom Object",
     "label_ja":"カスタムオブジェクト",
     "children":{  
        // "actionOverrides":{"typeName":"ActionOverride","name":"actionName"},
        "fields":{"typeName":"CustomField","name":"fullName","label":"Custom Field","label_ja":"カスタム項目"},
        "businessProcesses":{"typeName":"BusinessProcess","name":"fullName","label":"","label_ja":""},
        "recordTypes":{"typeName":"RecordType","name":"fullName","label":"Record Type","label_ja":"レコードタイプ"},
        "webLinks":{"typeName":"WebLink","name":"fullName","label":"Button or Link","label_ja":"ボタンまたはリンク"},
        "validationRules":{"typeName":"ValidationRule","name":"fullName","label":"Validation Rule","label_ja":"入力規則"},
        "namedFilters":{"typeName":"NamedFilter","name":"fullName","label":"","label_ja":""},
        "sharingReasons":{"typeName":"SharingReason","name":"fullName","label":"Apex Sharing Reason","label_ja":"Apex 共有の理由"},
        "listViews":{"typeName":"ListView","name":"fullName","label":"List View","label_ja":"リストビュー"},
        "fieldSets":{"typeName":"FieldSet","name":"fullName","label":"Field Set","label_ja":"項目セット"},
        "compactLayouts":{"typeName":"CompactLayout","name":"fullName","label":"Compact Layout","label_ja":"コンパクトレイアウト"}
     }
  },
  "reportTypes":{  
     "xmlName":"ReportType",
     "label":"Custom Report Type",
     "label_ja":"カスタムレポートタイプ",
     "children":{  

     }
  },
  "reports":{  
     "xmlName":"Report",
     "label":"Report",
     "label_ja":"レポート",
     "children":{  

     }
  },
  "dashboards":{  
     "xmlName":"Dashboard",
     "label":"Dashboard",
     "label_ja":"ダッシュボード",
     "children":{  

     }
  },
  "analyticSnapshots":{  
     "xmlName":"AnalyticSnapshot",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "layouts":{  
     "xmlName":"Layout",
     "label":"Page Layout",
     "label_ja":"ページレイアウト",
     "children":{  

     }
  },
  "portals":{  
     "xmlName":"Portal",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "documents":{  
     "xmlName":"Document",
     "label":"Document",
     "label_ja":"ドキュメント",
     "children":{  

     }
  },
  "weblinks":{  
     "xmlName":"CustomPageWebLink",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "quickActions":{  
     "xmlName":"QuickAction",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "flexipages":{  
     "xmlName":"FlexiPage",
     "label":"Lightning Page",
     "label_ja":"Lightning ページ",
     "children":{  

     }
  },
  "tabs":{  
     "xmlName":"CustomTab",
     "label":"Tab",
     "label_ja":"タブ",
     "children":{  

     }
  },
  "customApplicationComponents":{  
     "xmlName":"CustomApplicationComponent",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "applications":{  
     "xmlName":"CustomApplication",
     "label":"App",
     "label_ja":"アプリケーション",
     "children":{  

     }
  },
  "letterhead":{  
     "xmlName":"Letterhead",
     "label":"Letterhead",
     "label_ja":"レターヘッド",
     "children":{  

     }
  },
  "email":{  
     "xmlName":"EmailTemplate",
     "label":"Email Template",
     "label_ja":"メールテンプレート",
     "children":{  

     }
  },
  "workflows":{  
     "xmlName":"Workflow",
     "label":"Workflow Rule",
     "label_ja":"ワークフロールール",
     "children":{  
        "alerts":{"typeName":"WorkflowAlert","name":"fullName","label":"Workflow Email Alert","label_ja":"ワークフローメールアラート"},
        "tasks":{"typeName" : "WorkflowTask", "name" : "fullName","label":"Workflow Task","label_ja":"ワークフロー ToDo"},
        "outboundMessages":{"typeName" : "WorkflowOutboundMessage","name" : "fullName","label":"Workflow Outbound Message","label_ja":"ワークフローアウトバウンドメッセージ"},
        "fieldUpdates":{"typeName" : "WorkflowFieldUpdate", "name" : "fullName","label":"Workflow Field Update","label_ja":"ワークフロー項目自動更新"},
        "rules":{"typeName" : "WorkflowRule", "name" : "fullName","label":"Workflow Rule","label_ja":"ワークフロールール"},
        "emailRecipients":{"typeName" : "WorkflowEmailRecipient", "name" : "fullName","label":"","label_ja":""},
        "timeTriggers":{"typeName" : "WorkflowTimeTrigger", "name" : "fullName","label":"","label_ja":""},
        "actionReferences":{"typeName" : "WorkflowActionReference", "name" : "fullName","label":"","label_ja":""}
     }
  },
  "assignmentRules":{  
     "xmlName":"AssignmentRules",
     "label":"Assignment Rule",
     "label_ja":"割り当てルール",
     "children":{  

     }
  },
  "autoResponseRules":{  
     "xmlName":"AutoResponseRules",
     "label":"Auto-Response Rule",
     "label_ja":"自動レスポンスルール",
     "children":{  

     }
  },
  "escalationRules":{  
     "xmlName":"EscalationRules",
     "label":"Escalation Rule",
     "label_ja":"エスカレーションルール",
     "children":{  

     }
  },
  "roles":{  
     "xmlName":"Role",
     "label":"Role",
     "label_ja":"ロール",
     "children":{  

     }
  },
  "groups":{  
     "xmlName":"Group",
     "label":"Group",
     "label_ja":"グループ",
     "children":{  

     }
  },
  "postTemplates":{  
     "xmlName":"PostTemplate",
     "label":"Post Template",
     "label_ja":"投稿テンプレート",
     "children":{  

     }
  },
  "approvalProcesses":{  
     "xmlName":"ApprovalProcess",
     "label":"Approval Process",
     "label_ja":"承認プロセス",
     "children":{  

     }
  },
  "homePageComponents":{  
     "xmlName":"HomePageComponent",
     "label":"Home Page Component",
     "label_ja":"ホームページのコンポーネント",
     "children":{  

     }
  },
  "homePageLayouts":{  
     "xmlName":"HomePageLayout",
     "label":"Home Page Layout",
     "label_ja":"ホームページのページレイアウト",
     "children":{  

     }
  },
  "objectTranslations":{  
     "xmlName":"CustomObjectTranslation",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "flows":{  
     "xmlName":"Flow",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "classes":{  
     "xmlName":"ApexClass",
     "label":"Apex Class",
     "label_ja":"Apex クラス",
     "children":{  

     }
  },
  "triggers":{  
     "xmlName":"ApexTrigger",
     "label":"Apex Trigger",
     "label_ja":"Apex トリガ",
     "children":{  

     }
  },
  "profiles":{  
     "xmlName":"Profile",
     "label":"Profile",
     "label_ja":"プロファイル",
     "children":{  

     }
  },
  "permissionsets":{  
     "xmlName":"PermissionSet",
     "label":"Permission Set",
     "label_ja":"権限セット",
     "children":{  

     }
  },
  "datacategorygroups":{  
     "xmlName":"DataCategoryGroup",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "remoteSiteSettings":{  
     "xmlName":"RemoteSiteSetting",
     "label":"Remote Site",
     "label_ja":"リモートサイト",
     "children":{  

     }
  },
  "authproviders":{  
     "xmlName":"AuthProvider",
     "label":"Auth. Provider",
     "label_ja":"認証プロバイダ",
     "children":{  

     }
  },
  "leadSharingRules":{  
     "xmlName":"LeadSharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "campaignSharingRules":{  
     "xmlName":"CampaignSharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "caseSharingRules":{  
     "xmlName":"CaseSharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "contactSharingRules":{  
     "xmlName":"ContactSharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "opportunitySharingRules":{  
     "xmlName":"OpportunitySharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "accountSharingRules":{  
     "xmlName":"AccountSharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "customObjectSharingRules":{  
     "xmlName":"CustomObjectSharingRules",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "communities":{  
     "xmlName":"Community",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "callCenters":{  
     "xmlName":"CallCenter",
     "label":"Call Center",
     "label_ja":"コールセンター",
     "children":{  

     }
  },
  "connectedApps":{  
     "xmlName":"ConnectedApp",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "samlssoconfigs":{  
     "xmlName":"SamlSsoConfig",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "synonymDictionaries":{  
     "xmlName":"SynonymDictionary",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "settings":{  
     "xmlName":"Settings",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  },
  "aura":{  
     "xmlName":"AuraDefinitionBundle",
     "label":"Lightning Component Bundle",
     "label_ja":"Lightning コンポーネントバンドル",
     "children":{  

     }
  },
  "sharingRules":{  
     "xmlName":"SharingRules",
     "label":"",
     "label_ja":"",
     "children":{  
        "sharingTerritoryRules":"SharingTerritoryRule",
        "sharingOwnerRules":"SharingOwnerRule",
        "sharingCriteriaRules":"SharingCriteriaRule"
     }
  },
  "contentassets":{  
     "xmlName":"ContentAsset",
     "label":"Asset File",
     "label_ja":"アセットファイル",
     "children":{  

     }
  }, 
  "networks":{  
     "xmlName":"Network",
     "label":"Network",
     "label_ja":"ネットワーク",
     "children":{  

     }
  }, 
  "siteDotComSites":{  
     "xmlName":"SiteDotCom",
     "label":"",
     "label_ja":"",
     "children":{  

     }
  }, 
  "flowDefinitions":{  
     "xmlName":"FlowDefinition",
     "label":"Flow Definition",
     "label_ja":"フロー定義",
     "children":{  

     }
  },
  "matchingRules":{  
     "xmlName":"MatchingRules",
     "label":"Matching Rule",
     "label_ja":"一致ルール",
     "children":{  

     }
  }
};