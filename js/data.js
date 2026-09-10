/* =========================================================
   GovInnovate — data.js
   Core data model + seed dataset + challenge creation.
   ========================================================= */

let DB = null;

function genId(prefix){
  const n = Math.floor(1000 + Math.random()*9000);
  return `${prefix}-${Date.now().toString(36).slice(-4).toUpperCase()}${n}`;
}

/* ---------------------------------------------------------
   Seed dataset — realistic demo data (section 24 of brief)
   --------------------------------------------------------- */
function buildSeedData(){

  const startups = [
    {
      id:"ST001", name:"AquaSense Technologies", dpiitNumber:"DPIIT-2025-001234",
      founded:"2022-03-14", hq:"Pune, Maharashtra", stage:"Early Growth",
      technologies:["AI","IoT","Water Conservation","CleanTech","Environmental Monitoring"],
      problemAreas:["Water quality","Environmental sensing","Predictive analytics"],
      teamSize:18, description:"Low-cost IoT sensor networks combined with AI models for real-time water body monitoring and early warning of ecological stress.",
      pilotScore:87, riskLevel:"Medium", successRate:0.82, avgReview:4.3,
      verification:{status:"unverified", recognitionDate:"2025-01-18", foundingDate:"2022-03-14", validationStatus:"Pending"},
      previousPilots:[{name:"Lake Health Monitoring — Pune Smart City",dept:"Pune Municipal Corporation",outcome:"Successful"}],
      portfolio:["AquaGrid Sensor Network","BloomWatch AI Model","LakePulse Dashboard"]
    },
    {
      id:"ST002", name:"HydroVision Labs", dpiitNumber:"DPIIT-2024-004567",
      founded:"2021-07-02", hq:"Nagpur, Maharashtra", stage:"Growth",
      technologies:["Water Conservation","IoT","Remote Sensing","AI"],
      problemAreas:["Water quality","Rural infrastructure"],
      teamSize:26, description:"Remote-sensing and satellite-imagery driven water quality assessment for rural water bodies.",
      pilotScore:78, riskLevel:"Low", successRate:0.9, avgReview:4.5,
      verification:{status:"verified", recognitionDate:"2024-02-10", foundingDate:"2021-07-02", validationStatus:"Verified"},
      previousPilots:[{name:"River Basin Quality Index",dept:"Maharashtra Pollution Control Board",outcome:"Successful"}],
      portfolio:["HydroScan Satellite Module","AquaIndex API"]
    },
    {
      id:"ST003", name:"AgriPulse AI", dpiitNumber:"DPIIT-2023-009988",
      founded:"2020-11-20", hq:"Nashik, Maharashtra", stage:"Growth",
      technologies:["AgriTech","AI","Computer Vision"],
      problemAreas:["Crop health","Yield prediction"],
      teamSize:34, description:"Computer-vision based early detection of crop disease from field imagery, integrated with advisory workflows.",
      pilotScore:81, riskLevel:"Medium", successRate:0.75, avgReview:4.1,
      verification:{status:"verified", recognitionDate:"2023-05-30", foundingDate:"2020-11-20", validationStatus:"Verified"},
      previousPilots:[{name:"Crop Disease Early Warning",dept:"Dept of Agriculture, Maharashtra",outcome:"In Progress"}],
      portfolio:["PulseVision Scanner App","CropHealth Advisory Engine"]
    },
    {
      id:"ST004", name:"UrbanGrid Innovations", dpiitNumber:"DPIIT-2024-002211",
      founded:"2021-01-09", hq:"Mumbai, Maharashtra", stage:"Growth",
      technologies:["Smart Energy","IoT","Data Analytics"],
      problemAreas:["Energy monitoring","Grid optimisation"],
      teamSize:22, description:"Smart metering and grid analytics platform for municipal energy monitoring.",
      pilotScore:74, riskLevel:"Medium", successRate:0.7, avgReview:4.0,
      verification:{status:"verified", recognitionDate:"2024-06-01", foundingDate:"2021-01-09", validationStatus:"Verified"},
      previousPilots:[],
      portfolio:["GridSense Meter","UrbanGrid Analytics Console"]
    },
    {
      id:"ST005", name:"CleanFlow Systems", dpiitNumber:"DPIIT-2025-003345",
      founded:"2023-02-17", hq:"Aurangabad, Maharashtra", stage:"Early Stage",
      technologies:["Waste Management","Robotics","IoT"],
      problemAreas:["Waste segregation","Municipal operations"],
      teamSize:11, description:"Robotic-assisted waste segregation units for municipal collection points.",
      pilotScore:62, riskLevel:"High", successRate:0.55, avgReview:3.6,
      verification:{status:"unverified", recognitionDate:"2025-03-11", foundingDate:"2023-02-17", validationStatus:"Pending"},
      previousPilots:[],
      portfolio:["SegreBot Unit"]
    },
    {
      id:"ST006", name:"DroneMatrix", dpiitNumber:"DPIIT-2024-007712",
      founded:"2020-05-25", hq:"Pune, Maharashtra", stage:"Growth",
      technologies:["Drones","AgriTech","Surveillance","AI"],
      problemAreas:["Aerial monitoring","Crop surveillance"],
      teamSize:29, description:"Autonomous drone fleets for agricultural surveillance and infrastructure inspection.",
      pilotScore:80, riskLevel:"Medium", successRate:0.78, avgReview:4.2,
      verification:{status:"verified", recognitionDate:"2024-04-19", foundingDate:"2020-05-25", validationStatus:"Verified"},
      previousPilots:[{name:"Canal Infrastructure Survey",dept:"Water Resources Department",outcome:"Successful"}],
      portfolio:["MatrixFlight OS","FieldEye Camera Payload"]
    },
    {
      id:"ST007", name:"CivicAI Labs", dpiitNumber:"DPIIT-2023-005521",
      founded:"2019-09-08", hq:"Mumbai, Maharashtra", stage:"Growth",
      technologies:["AI","Traffic Management","Computer Vision"],
      problemAreas:["Urban mobility","Traffic optimisation"],
      teamSize:41, description:"AI-driven adaptive traffic signal control and congestion prediction for urban corridors.",
      pilotScore:89, riskLevel:"Low", successRate:0.88, avgReview:4.6,
      verification:{status:"verified", recognitionDate:"2023-03-02", foundingDate:"2019-09-08", validationStatus:"Verified"},
      previousPilots:[{name:"Adaptive Signal Pilot — Andheri Corridor",dept:"Transport Department",outcome:"Successful"}],
      portfolio:["CivicFlow Signal Controller","TrafficPulse Predictor"]
    },
    {
      id:"ST008", name:"GreenSensor Technologies", dpiitNumber:"DPIIT-2025-006678",
      founded:"2023-08-30", hq:"Kolhapur, Maharashtra", stage:"Early Stage",
      technologies:["IoT","Environmental Monitoring","CleanTech"],
      problemAreas:["Air quality","Environmental sensing"],
      teamSize:9, description:"Low-power environmental sensor nodes for distributed air and water quality monitoring.",
      pilotScore:58, riskLevel:"High", successRate:0.5, avgReview:3.4,
      verification:{status:"unverified", recognitionDate:"2025-05-22", foundingDate:"2023-08-30", validationStatus:"Pending"},
      previousPilots:[],
      portfolio:["GreenNode Sensor"]
    }
  ];

  const departments = [
    {id:"DEPT01", name:"Water Resources Department, Maharashtra"},
    {id:"DEPT02", name:"Urban Development Department, Maharashtra"},
    {id:"DEPT03", name:"Transport Department, Maharashtra"},
    {id:"DEPT04", name:"Department of Agriculture, Maharashtra"},
    {id:"DEPT05", name:"Energy Department, Maharashtra"}
  ];

  const challenges = [
    {
      id:"CH001", title:"Algal Bloom Detection in Rural Lakes", department:"Water Resources Department, Maharashtra",
      description:"Develop an affordable technology solution capable of detecting and predicting algal blooms in rural water bodies using sensors, IoT devices, satellite imagery, or AI.",
      domain:"Environmental Monitoring", location:"Konkan Division, Maharashtra", budget:650000, duration:"16 weeks",
      requiredTech:"AI, IoT, Remote Sensing", validationCriteria:"≥90% detection accuracy against lab-verified samples over a 60-day window",
      expectedOutcome:"Early-warning system deployable across 25+ rural lakes", deadline:"2026-11-15",
      tags:["AI","IoT","Water Conservation","CleanTech","Environmental Monitoring"],
      status:"Shortlisted", shortlist:["ST001"], createdAt:"2026-08-02T09:12:00Z"
    },
    {
      id:"CH002", title:"Smart Waste Segregation", department:"Urban Development Department, Maharashtra",
      description:"Design a low-cost robotic or sensor-based system for automated segregation of dry, wet and hazardous waste at municipal collection points.",
      domain:"Waste Management", location:"Aurangabad Municipal Corporation", budget:480000, duration:"12 weeks",
      requiredTech:"Robotics, IoT, Computer Vision", validationCriteria:"≥85% segregation accuracy on mixed waste streams",
      expectedOutcome:"Deployable segregation unit for 10 collection points", deadline:"2026-10-30",
      tags:["Robotics","IoT","Waste Management"],
      status:"Open", shortlist:["ST005"], createdAt:"2026-07-20T10:00:00Z"
    },
    {
      id:"CH003", title:"Rural Water Quality Monitoring", department:"Water Resources Department, Maharashtra",
      description:"Continuous, low-cost monitoring of rural drinking water sources for contamination and quality parameters.",
      domain:"Environmental Monitoring", location:"Vidarbha Region, Maharashtra", budget:720000, duration:"20 weeks",
      requiredTech:"Remote Sensing, IoT, AI", validationCriteria:"≥92% correlation with certified lab results",
      expectedOutcome:"Statewide rollout-ready water quality index", deadline:"2026-09-10",
      tags:["Water Conservation","IoT","AI"],
      status:"Piloting", shortlist:["ST002"], createdAt:"2026-05-11T08:30:00Z"
    },
    {
      id:"CH004", title:"AI-Based Traffic Management", department:"Transport Department, Maharashtra",
      description:"Adaptive AI-based traffic signal control to reduce congestion on high-density urban corridors.",
      domain:"Urban Mobility", location:"Mumbai Metropolitan Region", budget:1100000, duration:"24 weeks",
      requiredTech:"AI, Computer Vision, IoT", validationCriteria:"≥18% reduction in average corridor travel time",
      expectedOutcome:"Scalable adaptive signal network", deadline:"2026-08-25",
      tags:["AI","Traffic Management","Computer Vision"],
      status:"Piloting", shortlist:["ST007"], createdAt:"2026-03-14T07:45:00Z"
    },
    {
      id:"CH005", title:"Predictive Crop Disease Detection", department:"Department of Agriculture, Maharashtra",
      description:"Field-imagery based early detection of crop disease outbreaks to reduce yield loss for smallholder farmers.",
      domain:"AgriTech", location:"Nashik & Ahmednagar Districts", budget:590000, duration:"18 weeks",
      requiredTech:"AI, Computer Vision", validationCriteria:"≥88% detection accuracy across 5 major crop types",
      expectedOutcome:"Field-deployable advisory tool for extension officers", deadline:"2026-09-28",
      tags:["AgriTech","AI","Computer Vision"],
      status:"Piloting", shortlist:["ST003"], createdAt:"2026-04-02T11:20:00Z"
    },
    {
      id:"CH006", title:"Smart Energy Monitoring", department:"Energy Department, Maharashtra",
      description:"Municipal-scale smart metering and analytics to identify transmission loss and optimise load distribution.",
      domain:"Smart Energy", location:"Nagpur Circle", budget:830000, duration:"20 weeks",
      requiredTech:"IoT, Data Analytics", validationCriteria:"≥12% reduction in identified transmission loss",
      expectedOutcome:"Grid-wide smart metering rollout plan", deadline:"2026-10-05",
      tags:["Smart Energy","IoT","Data Analytics"],
      status:"Piloting", shortlist:["ST004"], createdAt:"2026-05-29T09:00:00Z"
    }
  ];

  const pilots = [
    {
      id:"P001", challengeId:"CH003", startupId:"ST002", department:"Water Resources Department, Maharashtra",
      title:"HydroVision Rural Water Quality Pilot", currentStage:3,
      stages:[
        {name:"PoC Selection", status:"done", start:"2026-05-15", end:"2026-05-29", responsible:"Water Resources Dept.", description:"Proof-of-concept review of HydroVision's remote sensing model.", progress:100},
        {name:"Sandbox Integration", status:"done", start:"2026-05-30", end:"2026-06-20", responsible:"HydroVision Labs", description:"Integrated with department's sandbox data environment.", progress:100},
        {name:"Active Micro-Pilot", status:"done", start:"2026-06-21", end:"2026-07-25", responsible:"HydroVision Labs", description:"Deployed across 12 monitoring points in Vidarbha.", progress:100},
        {name:"Validation", status:"active", start:"2026-07-26", end:null, responsible:"Water Resources Dept.", description:"Validating readings against certified lab samples.", progress:55},
        {name:"Scale-Up Procurement", status:"locked", start:null, end:null, responsible:"—", description:"Pending validation sign-off.", progress:0}
      ]
    },
    {
      id:"P002", challengeId:"CH005", startupId:"ST003", department:"Department of Agriculture, Maharashtra",
      title:"AgriPulse Crop Disease Early Warning Pilot", currentStage:2,
      stages:[
        {name:"PoC Selection", status:"done", start:"2026-04-10", end:"2026-04-24", responsible:"Dept. of Agriculture", description:"Reviewed model accuracy on historical field imagery.", progress:100},
        {name:"Sandbox Integration", status:"done", start:"2026-04-25", end:"2026-05-15", responsible:"AgriPulse AI", description:"Connected to extension officer advisory workflow sandbox.", progress:100},
        {name:"Active Micro-Pilot", status:"active", start:"2026-05-16", end:null, responsible:"AgriPulse AI", description:"Live field deployment across Nashik district farms.", progress:60},
        {name:"Validation", status:"locked", start:null, end:null, responsible:"—", description:"Pending micro-pilot completion.", progress:0},
        {name:"Scale-Up Procurement", status:"locked", start:null, end:null, responsible:"—", description:"Pending validation sign-off.", progress:0}
      ]
    },
    {
      id:"P003", challengeId:"CH004", startupId:"ST007", department:"Transport Department, Maharashtra",
      title:"CivicAI Adaptive Signal Pilot", currentStage:4,
      stages:[
        {name:"PoC Selection", status:"done", start:"2026-03-20", end:"2026-04-02", responsible:"Transport Dept.", description:"Benchmarked against baseline signal timing data.", progress:100},
        {name:"Sandbox Integration", status:"done", start:"2026-04-03", end:"2026-04-20", responsible:"CivicAI Labs", description:"Integrated with traffic control sandbox.", progress:100},
        {name:"Active Micro-Pilot", status:"done", start:"2026-04-21", end:"2026-06-10", responsible:"CivicAI Labs", description:"Deployed on the Andheri-Kurla corridor.", progress:100},
        {name:"Validation", status:"done", start:"2026-06-11", end:"2026-07-15", responsible:"Transport Dept.", description:"Validated a 21% travel-time reduction.", progress:100},
        {name:"Scale-Up Procurement", status:"active", start:"2026-07-16", end:null, responsible:"Transport Dept.", description:"Preparing scale-up procurement documentation.", progress:35}
      ]
    },
    {
      id:"P004", challengeId:"CH006", startupId:"ST004", department:"Energy Department, Maharashtra",
      title:"UrbanGrid Smart Metering Pilot", currentStage:1,
      stages:[
        {name:"PoC Selection", status:"done", start:"2026-06-05", end:"2026-06-18", responsible:"Energy Dept.", description:"Reviewed metering hardware and analytics dashboard.", progress:100},
        {name:"Sandbox Integration", status:"active", start:"2026-06-19", end:null, responsible:"UrbanGrid Innovations", description:"Integrating with Nagpur circle billing sandbox.", progress:45},
        {name:"Active Micro-Pilot", status:"locked", start:null, end:null, responsible:"—", description:"Pending sandbox sign-off.", progress:0},
        {name:"Validation", status:"locked", start:null, end:null, responsible:"—", description:"Pending micro-pilot completion.", progress:0},
        {name:"Scale-Up Procurement", status:"locked", start:null, end:null, responsible:"—", description:"Pending validation sign-off.", progress:0}
      ]
    }
  ];

  const milestones = [
    // P001 — HydroVision (further along; most approved & released)
    {id:"M-101", pilotId:"P001", name:"Sensor Deployment", target:"40 monitoring points", evidence:{filename:"deployment_log.pdf",type:"application/pdf",uploadedAt:"2026-06-18T10:20:00Z"}, status:"Approved", paymentAmount:220000, paymentStatus:"Released"},
    {id:"M-102", pilotId:"P001", name:"Data Collection — 30 Days", target:"30 days continuous data", evidence:{filename:"data_collection_summary.pdf",type:"application/pdf",uploadedAt:"2026-07-20T09:00:00Z"}, status:"Approved", paymentAmount:180000, paymentStatus:"Released"},
    {id:"M-103", pilotId:"P001", name:"Accuracy Validation", target:"≥92% correlation with lab data", evidence:{filename:"lab_correlation_report.pdf",type:"application/pdf",uploadedAt:"2026-08-05T14:10:00Z"}, status:"Submitted", paymentAmount:200000, paymentStatus:"Pending"},
    {id:"M-104", pilotId:"P001", name:"Final Pilot Report", target:"Consolidated pilot report", evidence:null, status:"Locked", paymentAmount:120000, paymentStatus:"Locked"},
    // P002 — AgriPulse
    {id:"M-201", pilotId:"P002", name:"Field Sensor & Camera Setup", target:"15 field sites", evidence:{filename:"site_setup_report.pdf",type:"application/pdf",uploadedAt:"2026-05-25T11:00:00Z"}, status:"Approved", paymentAmount:150000, paymentStatus:"Released"},
    {id:"M-202", pilotId:"P002", name:"Detection Accuracy — Interim", target:"≥80% interim accuracy", evidence:{filename:"interim_accuracy_report.pdf",type:"application/pdf",uploadedAt:"2026-07-02T13:45:00Z"}, status:"Pending", paymentAmount:170000, paymentStatus:"Locked"},
    {id:"M-203", pilotId:"P002", name:"Final Detection Validation", target:"≥88% final accuracy", evidence:null, status:"Locked", paymentAmount:150000, paymentStatus:"Locked"},
    // P003 — CivicAI (near complete)
    {id:"M-301", pilotId:"P003", name:"Signal Controller Deployment", target:"8 intersections", evidence:{filename:"controller_deployment.pdf",type:"application/pdf",uploadedAt:"2026-04-28T10:00:00Z"}, status:"Approved", paymentAmount:280000, paymentStatus:"Released"},
    {id:"M-302", pilotId:"P003", name:"Travel-Time Reduction Validation", target:"≥15% reduction", evidence:{filename:"travel_time_validation.pdf",type:"application/pdf",uploadedAt:"2026-06-30T09:30:00Z"}, status:"Approved", paymentAmount:320000, paymentStatus:"Released"},
    {id:"M-303", pilotId:"P003", name:"Scale-Up Readiness Report", target:"Corridor-wide readiness assessment", evidence:{filename:"scaleup_readiness.pdf",type:"application/pdf",uploadedAt:"2026-07-28T15:00:00Z"}, status:"Submitted", paymentAmount:250000, paymentStatus:"Pending"},
    // P004 — UrbanGrid (early)
    {id:"M-401", pilotId:"P004", name:"Meter Installation", target:"200 smart meters", evidence:{filename:"meter_installation_log.pdf",type:"application/pdf",uploadedAt:"2026-07-10T08:00:00Z"}, status:"Submitted", paymentAmount:210000, paymentStatus:"Pending"},
    {id:"M-402", pilotId:"P004", name:"Billing Sandbox Integration", target:"Full sandbox sync", evidence:null, status:"Locked", paymentAmount:190000, paymentStatus:"Locked"}
  ];

  const riskAssessments = [
    {
      id:"RA-P001", pilotId:"P001",
      factors:{maturity:2,readiness:2,complexity:3,dataSensitivity:2,citizenImpact:3,financialExposure:2,infrastructure:3},
      score:38, category:"MEDIUM", date:"2026-07-26T10:00:00Z", approvalStatus:"Reviewed",
      recommendations:["Maintain sandbox monitoring through the validation stage.","Cross-check readings against certified labs monthly."]
    },
    {
      id:"RA-P003", pilotId:"P003",
      factors:{maturity:1,readiness:1,complexity:2,dataSensitivity:2,citizenImpact:4,financialExposure:3,infrastructure:2},
      score:33, category:"MEDIUM", date:"2026-07-16T10:00:00Z", approvalStatus:"Reviewed",
      recommendations:["Prepare a phased corridor-wide rollout plan.","Maintain manual override capability during scale-up."]
    }
  ];

  const auditLogs = [
    {id:genId("AL"), text:"Challenge published — AI-Based Traffic Management", timestamp:"2026-03-14T07:45:00Z"},
    {id:genId("AL"), text:"CivicAI Labs verified through prototype verification engine", timestamp:"2026-03-15T09:10:00Z"},
    {id:genId("AL"), text:"Pilot P003 advanced to Scale-Up Procurement", timestamp:"2026-07-16T10:05:00Z"},
    {id:genId("AL"), text:"Milestone M-302 approved — payment released", timestamp:"2026-06-30T10:15:00Z"},
    {id:genId("AL"), text:"Milestone M-401 evidence uploaded by UrbanGrid Innovations", timestamp:"2026-07-10T08:05:00Z"},
    {id:genId("AL"), text:"Risk score calculated for Pilot P001 — MEDIUM", timestamp:"2026-07-26T10:00:00Z"}
  ];

  const notifications = [
    {id:genId("NT"), text:"Milestone M-103 requires department approval.", createdAt:"2026-08-05T14:15:00Z", read:false},
    {id:genId("NT"), text:"Milestone M-303 requires department approval.", createdAt:"2026-07-28T15:05:00Z", read:false},
    {id:genId("NT"), text:"UrbanGrid Innovations submitted evidence for Meter Installation.", createdAt:"2026-07-10T08:05:00Z", read:true},
    {id:genId("NT"), text:"Pilot P003 advanced to Scale-Up Procurement.", createdAt:"2026-07-16T10:05:00Z", read:true}
  ];

  /* ---------------------------------------------------------
     Expert / Verifier module — seed data
     --------------------------------------------------------- */
  const experts = [
    {id:"EXP001", name:"Dr. Ananya Kulkarni", domain:"Water Technology & IoT", experience:12, organization:"Government/Academic/Industry Expert", status:"Active"},
    {id:"EXP002", name:"Prof. Rajeev Sawant", domain:"AgriTech & Computer Vision", experience:9, organization:"Government/Academic/Industry Expert", status:"Active"}
  ];

  const expertAssignments = [
    // Live demo item — AquaSense awaiting expert review (Section 22 walkthrough starts here)
    {id:"EA001", startupId:"ST001", challengeId:"CH001", expertId:"EXP001", type:"Pre-Pilot Technical Evaluation", deadline:"2026-09-20", status:"Awaiting Expert Review", assignedAt:"2026-09-02T09:30:00Z"},
    // HydroVision pilot already in Validation stage — ready for post-pilot expert validation
    {id:"EA002", startupId:"ST002", challengeId:"CH003", expertId:"EXP001", type:"Post-Pilot Technical Validation", deadline:"2026-09-15", status:"Under Evaluation", assignedAt:"2026-07-28T10:00:00Z"},
    // Completed pre-pilot evaluations (history / KPI counts)
    {id:"EA003", startupId:"ST003", challengeId:"CH005", expertId:"EXP001", type:"Pre-Pilot Technical Evaluation", deadline:"2026-04-20", status:"Recommended", assignedAt:"2026-04-05T09:00:00Z"},
    {id:"EA004", startupId:"ST004", challengeId:"CH006", expertId:"EXP001", type:"Pre-Pilot Technical Evaluation", deadline:"2026-06-10", status:"Recommended with Conditions", assignedAt:"2026-05-28T09:00:00Z"},
    {id:"EA005", startupId:"ST007", challengeId:"CH004", expertId:"EXP001", type:"Post-Pilot Technical Validation", deadline:"2026-07-20", status:"Pilot Validated", assignedAt:"2026-06-15T09:00:00Z"}
  ];

  const conflictDeclarations = [
    {id:"CD002", assignmentId:"EA002", expertId:"EXP001", declaredNoConflict:true, declaredAt:"2026-07-28T10:05:00Z"},
    {id:"CD003", assignmentId:"EA003", expertId:"EXP001", declaredNoConflict:true, declaredAt:"2026-04-05T09:10:00Z"},
    {id:"CD004", assignmentId:"EA004", expertId:"EXP001", declaredNoConflict:true, declaredAt:"2026-05-28T09:10:00Z"},
    {id:"CD005", assignmentId:"EA005", expertId:"EXP001", declaredNoConflict:true, declaredAt:"2026-06-15T09:10:00Z"}
  ];

  const evidenceReviews = [
    {id:"ER001", assignmentId:"EA001", evidenceName:"Pilot Test Report — 1,250 observations", evidenceType:"Test Result", claim:"System detects algal bloom with 90% accuracy.", claimedValue:"90%", verifiedValue:null, status:"Pending Review", comment:"", uploadedAt:"2026-08-30T11:00:00Z"},
    {id:"ER002", assignmentId:"EA001", evidenceName:"BloomWatch AI — Model Validation Certificate", evidenceType:"Certification", claim:"Third-party validated model architecture.", claimedValue:"—", verifiedValue:null, status:"Pending Review", comment:"", uploadedAt:"2026-08-30T11:05:00Z"},
    {id:"ER003", assignmentId:"EA001", evidenceName:"Field Demo Video — Konkan Lake Cluster", evidenceType:"Demo Video", claim:"Live sensor deployment across 3 lakes.", claimedValue:"—", verifiedValue:null, status:"Pending Review", comment:"", uploadedAt:"2026-08-30T11:08:00Z"},
    {id:"ER004", assignmentId:"EA003", evidenceName:"Interim Accuracy Report", evidenceType:"Test Result", claim:"Crop disease detection at 88% accuracy.", claimedValue:"88%", verifiedValue:"86.2%", status:"Verified", comment:"Consistent with field sample re-check.", uploadedAt:"2026-04-10T09:00:00Z", reviewedAt:"2026-04-18T10:00:00Z"},
    {id:"ER005", assignmentId:"EA004", evidenceName:"Smart Meter Accuracy Certificate", evidenceType:"Certification", claim:"Metering accuracy within IS 13010 tolerance.", claimedValue:"±1%", verifiedValue:"±1.4%", status:"Needs Clarification", comment:"Please provide testing methodology and dataset details.", uploadedAt:"2026-06-01T09:00:00Z", reviewedAt:"2026-06-08T10:00:00Z"}
  ];

  const expertEvaluations = [
    {
      id:"EV003", assignmentId:"EA003", startupId:"ST003", challengeId:"CH005", expertId:"EXP001",
      scores:{technicalFeasibility:90, innovation:82, deploymentReadiness:88, scalability:85, teamCapability:86, evidenceQuality:80},
      answers:{}, overallScore:86.4, recommendation:"Recommend",
      conditions:[], comments:"Strong field-tested computer vision pipeline with credible accuracy evidence.",
      status:"Submitted", createdAt:"2026-04-15T09:00:00Z", submittedAt:"2026-04-18T10:30:00Z"
    },
    {
      id:"EV004", assignmentId:"EA004", startupId:"ST004", challengeId:"CH006", expertId:"EXP001",
      scores:{technicalFeasibility:74, innovation:62, deploymentReadiness:70, scalability:66, teamCapability:75, evidenceQuality:58},
      answers:{}, overallScore:68.2, recommendation:"Recommend with Conditions",
      conditions:["Provide independent metering-accuracy validation.","Demonstrate integration with existing billing infrastructure."],
      comments:"Feasible but evidence of metering accuracy needs independent confirmation before scale-up.",
      status:"Submitted", createdAt:"2026-06-02T09:00:00Z", submittedAt:"2026-06-08T10:30:00Z"
    }
  ];

  const pilotValidations = [
    {
      id:"PV005", assignmentId:"EA005", pilotId:"P003", expertId:"EXP001",
      metrics:[
        {name:"Travel-Time Reduction", target:"≥18%", actual:"21%", status:"Pass", evidence:"travel_time_validation.pdf", comment:"Exceeded target across all 8 intersections."},
        {name:"Response / Processing Time", target:"<10 min", actual:"6 min", status:"Pass", evidence:"controller_deployment.pdf", comment:""},
        {name:"System / Sensor Uptime", target:"≥95%", actual:"98.1%", status:"Pass", evidence:"scaleup_readiness.pdf", comment:""},
        {name:"False Positive / Error Rate", target:"<5%", actual:"3.2%", status:"Pass", evidence:"scaleup_readiness.pdf", comment:""}
      ],
      overallResult:100, recommendation:"Recommend", comments:"All corridor-wide pilot targets were met or exceeded; ready for scale-up procurement review.",
      evidenceCompleteness:100, status:"Submitted", createdAt:"2026-06-20T09:00:00Z", submittedAt:"2026-07-16T10:00:00Z"
    }
  ];

  const expertClarifications = [
    {id:"CL004", assignmentId:"EA004", question:"Please provide testing methodology and dataset details.", response:null, status:"Pending", requestedAt:"2026-06-08T10:05:00Z"}
  ];

  const expertComments = [];

  return {
    currentUser:null,
    startups, departments, challenges,
    applications:[], pilots, milestones,
    documents:[], notifications, auditLogs, riskAssessments,
    experts, expertAssignments, expertEvaluations, evidenceReviews,
    pilotValidations, conflictDeclarations, expertComments, expertClarifications
  };
}

/* ---------------------------------------------------------
   State lifecycle
   --------------------------------------------------------- */
function initDB(){
  const existing = Storage.load();
  if(existing){
    DB = existing;
    ensureExpertModuleDefaults(DB);
    ensurePilotProcurementDefaults(DB);
    persist();
  }else{
    DB = buildSeedData();
    ensurePilotProcurementDefaults(DB);
    Storage.save(DB);
  }
}

function persist(){
  Storage.save(DB);
}

function resetDemoData(){
  DB = buildSeedData();
  DB.currentUser = null;
  Storage.clear();
  persist();
}

/* ---------------------------------------------------------
   Challenge creation (section 3 of brief)
   --------------------------------------------------------- */
const TECH_KEYWORD_MAP = {
  water:"Water Conservation", lake:"Water Conservation", algal:"CleanTech", bloom:"CleanTech",
  iot:"IoT", sensor:"IoT", satellite:"Remote Sensing", drone:"Drones",
  ai:"AI", ml:"AI", "computer vision":"Computer Vision", camera:"Computer Vision",
  traffic:"Traffic Management", congestion:"Traffic Management",
  crop:"AgriTech", farm:"AgriTech", agriculture:"AgriTech",
  waste:"Waste Management", segregation:"Waste Management", robot:"Robotics",
  energy:"Smart Energy", grid:"Smart Energy", meter:"Smart Energy",
  environment:"Environmental Monitoring", quality:"Environmental Monitoring", pollution:"Environmental Monitoring"
};

function autoTagChallenge(title, description){
  const text = `${title} ${description}`.toLowerCase();
  const tags = new Set();
  Object.keys(TECH_KEYWORD_MAP).forEach(kw=>{
    if(text.includes(kw)) tags.add(TECH_KEYWORD_MAP[kw]);
  });
  if(tags.size===0) tags.add("General Innovation");
  return Array.from(tags);
}

function createChallenge(fields){
  const tags = autoTagChallenge(fields.title, fields.description);
  const challenge = {
    id: genId("CH"),
    title: fields.title,
    department: fields.department,
    description: fields.description,
    domain: fields.domain,
    location: fields.location,
    budget: Number(fields.budget),
    duration: fields.duration,
    requiredTech: fields.requiredTech,
    validationCriteria: fields.validationCriteria,
    expectedOutcome: fields.expectedOutcome,
    deadline: fields.deadline,
    tags, status:"Open", shortlist:[], createdAt: new Date().toISOString()
  };
  DB.challenges.unshift(challenge);
  addAuditLog(`Challenge published — ${challenge.title}`);
  persist();
  return challenge;
}

/* ---------------------------------------------------------
   Lookup helpers
   --------------------------------------------------------- */
const getStartup = id => DB.startups.find(s=>s.id===id);
const getChallenge = id => DB.challenges.find(c=>c.id===id);
const getPilot = id => DB.pilots.find(p=>p.id===id);
const getMilestonesForPilot = id => DB.milestones.filter(m=>m.pilotId===id);
const getPilotForStartup = id => DB.pilots.find(p=>p.startupId===id);
