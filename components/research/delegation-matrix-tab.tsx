'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, CheckCircle, X, GripVertical, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import OwnerSelectorModal from '@/components/modals/submodals/owner-selector-submodal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { ClientAPI } from '@/lib/client-api';
import ConfirmationModal from '@/components/modals/submodals/confirmation-submodal';
import { Character, Task } from '@/types/entities';
import { STATION_CATEGORIES, TaskStatus } from '@/types/enums';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export interface MatrixTask {
  id: string;
  area: string;
  station: string;
  task: string;
  f: number;
  a: number;
  i: number;
  s: number;
  currentOwner: string;
  idealOwner: string;
  doc: 'Y' | 'N' | 'H';
  feed: 'Y' | 'N';
  delegation: string;
  reasons: string;
  notes: string;
  taskId?: string;
}

// Default dynamic rules
const DEFAULT_RULES = {
  statusPenalties: {
    noDoc: 20,
    halfDoc: 10,
    noFeed: 10,
    noCurrentOwner: 10,
    mismatchIdealCurrent: 20,
    mismatchFThreshold: 4, mismatchFPenalty: 10,
    mismatchAThreshold: 4, mismatchAPenalty: 10,
    mismatchIThreshold: 2, mismatchIPenalty: 10,
    mismatchSThreshold: 2, mismatchSPenalty: 10,
  },
  delegation: {
    targetFounder: "akiles",
    targetAI: "pixelbrain",
    highDpsMin: 12,
    midDpsMin: 8,
    midDpsMax: 11,
    fallbackDpsMax: 7
  },
  pointsLegend: {
    f: "5=Daily, 4=Frequent, 3=Weekly, 2=Bi-Weekly, 1=Monthly, 0=Never",
    a: "5=Soul-Crushing, 4=Frustrating, 3=Neutral, 2=Fine, 1=Love it, 0=Mind-Blowing",
    i: "5=Terrible, 4=Supportive, 3=Necessary, 2=Growth, 1=Critical, 0=Highest Priority",
    s: "5=No-Brainer, 4=Easy, 3=Procedural (SOP), 2=Difficult, 1=Complex, 0=Hardest"
  },
  pointsMapping: {
    f: ["Never", "Monthly", "Bi-Weekly", "Weekly", "Frequent", "Daily"],
    a: ["Mind-Blowing", "Love it", "Fine", "Neutral", "Frustrating", "Soul-Crushing"],
    i: ["Highest Priority", "Critical", "Growth", "Necessary", "Supportive", "Terrible"],
    s: ["Hardest", "Complex", "Difficult", "Procedural (SOP)", "Easy", "No-Brainer"]
  }
};

const INITIAL_MOCK_DATA: MatrixTask[] = [
  {
    "id": "1",
    "area": "ADMIN",
    "station": "strategy",
    "task": "plans-roadmaps",
    "f": 1,
    "a": 1,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Impact Growth, Complex"
  },
  {
    "id": "2",
    "area": "ADMIN",
    "station": "strategy",
    "task": "program-schedule",
    "f": 3,
    "a": 4,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "High DPS, S=3+",
    "notes": "Pixelbrain not Ready"
  },
  {
    "id": "3",
    "area": "ADMIN",
    "station": "strategy",
    "task": "paperwork",
    "f": 1,
    "a": 5,
    "i": 2,
    "s": 4,
    "currentOwner": "Founder",
    "idealOwner": "Co-Lawyer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "High DPS, High A 5",
    "notes": "Soul-Crush, Impact Growth, Poorly Executed (-10%)"
  },
  {
    "id": "4",
    "area": "ADMIN",
    "station": "finances",
    "task": "business-admin",
    "f": 5,
    "a": 2,
    "i": 1,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Mid DPS, S=1",
    "notes": "Daily (TheGame)"
  },
  {
    "id": "5",
    "area": "ADMIN",
    "station": "finances",
    "task": "budgets-negotiations",
    "f": 2,
    "a": 3,
    "i": 3,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "S=3+",
    "notes": "Pixelbrain not Ready"
  },
  {
    "id": "6",
    "area": "ADMIN",
    "station": "team",
    "task": "team-management",
    "f": 4,
    "a": 3,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "Mid DPS, S=1",
    "notes": "Frequent, Impact Growth, Complex."
  },
  {
    "id": "7",
    "area": "ADMIN",
    "station": "team",
    "task": "team-payroll",
    "f": 2,
    "a": 3,
    "i": 1,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "S=3+",
    "notes": "Critical"
  },
  {
    "id": "8",
    "area": "ADMIN",
    "station": "team",
    "task": "team-formation",
    "f": 0,
    "a": 3,
    "i": 2,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Mid DPS",
    "notes": ""
  },
  {
    "id": "9",
    "area": "ADMIN",
    "station": "inventory",
    "task": "stock-count",
    "f": 3,
    "a": 4,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Assistant",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "High DPS, S=3+",
    "notes": "Frustrating (Time), Impact Growth, Assistant Not Ready"
  },
  {
    "id": "10",
    "area": "ADMIN",
    "station": "inventory",
    "task": "restock-item",
    "f": 3,
    "a": 4,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Assistant, Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "High DPS, S=3+",
    "notes": "Frustrating (Time), Impact Growth, Assistant Not Ready"
  },
  {
    "id": "11",
    "area": "ADMIN",
    "station": "inventory",
    "task": "buy-order-item",
    "f": 1,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep-Until",
    "reasons": "S=3+",
    "notes": "Impact Growth, Delivery"
  },
  {
    "id": "12",
    "area": "ADMIN",
    "station": "inventory",
    "task": "organize-spaces",
    "f": 1,
    "a": 3,
    "i": 4,
    "s": 4,
    "currentOwner": "Founder",
    "idealOwner": "Assistant",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "High DPS, High A 4",
    "notes": "Assistant Not Ready"
  },
  {
    "id": "13",
    "area": "ADMIN",
    "station": "inventory",
    "task": "equipment-maintainance",
    "f": 1,
    "a": 4,
    "i": 3,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Producer",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep-Unitl",
    "reasons": "High A 4",
    "notes": "Frustrating (Exp), Difficult"
  },
  {
    "id": "14",
    "area": "ADMIN",
    "station": "transport",
    "task": "transport-service-{item}",
    "f": 2,
    "a": 3,
    "i": 1,
    "s": 5,
    "currentOwner": "Founder",
    "idealOwner": "Delivery, Co-Assistant",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "High DPS, S=3+",
    "notes": "Impact Critical"
  },
  {
    "id": "15",
    "area": "ADMIN",
    "station": "transport",
    "task": "vehicle-repair",
    "f": 1,
    "a": 4,
    "i": 2,
    "s": 3,
    "currentOwner": "Co-Mechanic",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Worked",
    "reasons": "Low I 2 + High A 4",
    "notes": "Frustrating (Exp), Impact Growth"
  },
  {
    "id": "16",
    "area": "ADMIN",
    "station": "rents",
    "task": "pay-rent",
    "f": 1,
    "a": 3,
    "i": 1,
    "s": 5,
    "currentOwner": "Founder",
    "idealOwner": "Co-Assistant",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "S=3+, High I 1",
    "notes": "Impact Critical"
  },
  {
    "id": "17",
    "area": "ADMIN",
    "station": "rents",
    "task": "pay-services",
    "f": 1,
    "a": 3,
    "i": 1,
    "s": 5,
    "currentOwner": "Founder",
    "idealOwner": "Co-Assistant",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "S=3+, High I 1",
    "notes": "Impact Critical"
  },
  {
    "id": "18",
    "area": "ADMIN",
    "station": "partnerships",
    "task": "manage-partnerships",
    "f": 0,
    "a": 2,
    "i": 2,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Impact Growth, Difficult"
  },
  {
    "id": "19",
    "area": "ADMIN",
    "station": "projects",
    "task": "project-documentation",
    "f": 1,
    "a": 2,
    "i": 3,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Complex"
  },
  {
    "id": "20",
    "area": "ADMIN",
    "station": "projects",
    "task": "investments",
    "f": 1,
    "a": 2,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Automate",
    "reasons": "Low DPS",
    "notes": "Pixelbrain not Ready"
  },
  {
    "id": "21",
    "area": "RESEARCH",
    "station": "library",
    "task": "create-llibrary-document",
    "f": 3,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "S=3+",
    "notes": "Impact Growth, Pixelbrain not Ready"
  },
  {
    "id": "22",
    "area": "RESEARCH",
    "station": "library",
    "task": "document-process",
    "f": 1,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "Low I, S=3+",
    "notes": "Impact Growth, Pixelbrain not Ready"
  },
  {
    "id": "23",
    "area": "RESEARCH",
    "station": "library",
    "task": "create-review-infographics",
    "f": 1,
    "a": 3,
    "i": 3,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "S=3+",
    "notes": "Impact Growth, Pixelbrain not Ready"
  },
  {
    "id": "24",
    "area": "RESEARCH",
    "station": "library",
    "task": "create-analysis-document",
    "f": 3,
    "a": 3,
    "i": 3,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "High DPS, S=3+",
    "notes": "Impact Growth, Pixelbrain not Ready"
  },
  {
    "id": "25",
    "area": "RESEARCH",
    "station": "library",
    "task": "get-read-ebook",
    "f": 1,
    "a": 2,
    "i": 2,
    "s": 4,
    "currentOwner": "",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "S=3+",
    "notes": "Impact Growth, Pixelbrain not Ready"
  },
  {
    "id": "26",
    "area": "RESEARCH",
    "station": "classes",
    "task": "teach",
    "f": 4,
    "a": 4,
    "i": 2,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Teachers",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep-Until",
    "reasons": "High DPS, High F+A",
    "notes": "Frequent, Frustrating"
  },
  {
    "id": "27",
    "area": "RESEARCH",
    "station": "classes",
    "task": "prepare-classes",
    "f": 3,
    "a": 4,
    "i": 3,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "High DPS, S=3+",
    "notes": "Frustrating (Time), Pixel Not Ready"
  },
  {
    "id": "28",
    "area": "RESEARCH",
    "station": "innovation",
    "task": "ideation-task",
    "f": 3,
    "a": 2,
    "i": 2,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Mid DPS + Low A",
    "notes": ""
  },
  {
    "id": "29",
    "area": "RESEARCH",
    "station": "innovation",
    "task": "prototype",
    "f": 3,
    "a": 2,
    "i": 3,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Mid DPS + Low A",
    "notes": ""
  },
  {
    "id": "30",
    "area": "RESEARCH",
    "station": "innovation",
    "task": "testing",
    "f": 3,
    "a": 2,
    "i": 4,
    "s": 4,
    "currentOwner": "",
    "idealOwner": "Co-Assistant",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "High DPS, S=3+",
    "notes": ""
  },
  {
    "id": "31",
    "area": "DEV",
    "station": "systems-dev",
    "task": "systems-apps-dev",
    "f": 3,
    "a": 2,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Developer",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Mid DPS 8 + Low A 2",
    "notes": "No-Dev"
  },
  {
    "id": "32",
    "area": "ART-DESIGN",
    "station": "paint",
    "task": "create-art",
    "f": 3,
    "a": 1,
    "i": 1,
    "s": 0,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Critical, Hardest"
  },
  {
    "id": "33",
    "area": "ART-DESIGN",
    "station": "paint",
    "task": "live-painting",
    "f": 1,
    "a": 2,
    "i": 2,
    "s": 0,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Impact Growth, Hardest"
  },
  {
    "id": "34",
    "area": "ART-DESIGN",
    "station": "digitals",
    "task": "create-item",
    "f": 3,
    "a": 2,
    "i": 1,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Critical, Complex"
  },
  {
    "id": "35",
    "area": "ART-DESIGN",
    "station": "digitals",
    "task": "edit-item",
    "f": 3,
    "a": 4,
    "i": 2,
    "s": 4,
    "currentOwner": "Founder-Pixelbrain",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Pixel Ready, Frustrating (Time)"
  },
  {
    "id": "36",
    "area": "ART-DESIGN",
    "station": "design",
    "task": "product-design",
    "f": 1,
    "a": 2,
    "i": 3,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Co-Designer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "Mid DPS + Low A",
    "notes": "No-Designer (-10%)"
  },
  {
    "id": "37",
    "area": "ART-DESIGN",
    "station": "design",
    "task": "stand-design",
    "f": 1,
    "a": 3,
    "i": 3,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Co-Designer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "Mid DPS",
    "notes": "No-Designer (-10%)"
  },
  {
    "id": "38",
    "area": "ART-DESIGN",
    "station": "design",
    "task": "furniture-design",
    "f": 0,
    "a": 3,
    "i": 4,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Designer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "F=0",
    "notes": "No-Designer (-10%)"
  },
  {
    "id": "39",
    "area": "ART-DESIGN",
    "station": "design",
    "task": "package-design",
    "f": 0,
    "a": 3,
    "i": 4,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Co-Designer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "F=0",
    "notes": "No-Designer (-10%)"
  },
  {
    "id": "40",
    "area": "ART-DESIGN",
    "station": "design",
    "task": "create-3d-model",
    "f": 0,
    "a": 3,
    "i": 4,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Designer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "S=3+",
    "notes": "No-Designer (-10%)"
  },
  {
    "id": "41",
    "area": "ART-DESIGN",
    "station": "design",
    "task": "game-design",
    "f": 3,
    "a": 0,
    "i": 2,
    "s": 0,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "Low DPS",
    "notes": "Impact Growth, Hardest"
  },
  {
    "id": "42",
    "area": "ART-DESIGN",
    "station": "animation",
    "task": "create-animation",
    "f": 0,
    "a": 2,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Automate",
    "reasons": "F=0",
    "notes": "Impact Growth, Complex, Pixelbrain not Ready"
  },
  {
    "id": "43",
    "area": "MAKER-SPACE",
    "station": "craft",
    "task": "crafting",
    "f": 1,
    "a": 4,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Producer",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "Low I 2 + High A 4",
    "notes": "Impact Growth, Frustrating (Time), No-Producer (-10%)"
  },
  {
    "id": "44",
    "area": "SALES",
    "station": "booth-sales",
    "task": "document-upcomming-fairs-events",
    "f": 3,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Seller",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep-Until",
    "reasons": "S=3, Human-O",
    "notes": "Associate Until (+10%)"
  },
  {
    "id": "45",
    "area": "SALES",
    "station": "booth-sales",
    "task": "create-calendar-of-fairs-events",
    "f": 3,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Seller",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep-Until",
    "reasons": "S=3, Human-O",
    "notes": "Associate Until (+10%)"
  },
  {
    "id": "46",
    "area": "SALES",
    "station": "network",
    "task": "manage-network",
    "f": 4,
    "a": 3,
    "i": 1,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Seller",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "High DPS, S=3",
    "notes": "Frequent, Critical, Difficult, Seller Not Ready"
  },
  {
    "id": "47",
    "area": "SALES",
    "station": "network",
    "task": "expand-network",
    "f": 3,
    "a": 3,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Seller",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate",
    "reasons": "Mid DPS",
    "notes": "Impact Growth, Complex, Seller Not Ready"
  },
  {
    "id": "48",
    "area": "SALES",
    "station": "online-sales",
    "task": "manage-online-stores",
    "f": 3,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Seller",
    "idealOwner": "Seller-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegated-Automate",
    "reasons": "Mid DPS, S=3",
    "notes": "Impact Growth, Not Built (-20%) Delegated (+20%)"
  },
  {
    "id": "49",
    "area": "SALES",
    "station": "marketing",
    "task": "post-sm-content",
    "f": 3,
    "a": 5,
    "i": 2,
    "s": 2,
    "currentOwner": "Seller",
    "idealOwner": "Seller-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegated-Automate",
    "reasons": "Low I 2 + High A 4",
    "notes": "Soul-Crushing (Time), Impact Growth, Difficult, Delegated (+20%)"
  },
  {
    "id": "50",
    "area": "SALES",
    "station": "marketing",
    "task": "generate-lead-sale",
    "f": 3,
    "a": 4,
    "i": 2,
    "s": 2,
    "currentOwner": "Founder",
    "idealOwner": "Seller-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Delegate",
    "reasons": "Low I 2 + High A 4",
    "notes": "Impact Growth, Complex, Seller Not Ready"
  },
  {
    "id": "51",
    "area": "SALES",
    "station": "dispatches",
    "task": "dispatch-sold-items",
    "f": 4,
    "a": 4,
    "i": 1,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Seller",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "High A 4, S=3",
    "notes": "Frequent, Frustrating (Time), Critical"
  },
  {
    "id": "52",
    "area": "SALES",
    "station": "portfolio",
    "task": "portfolio-update",
    "f": 3,
    "a": 3,
    "i": 1,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Seller-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate-Automate",
    "reasons": "S=3",
    "notes": "Critical Seller-Pixelbrain Not Ready"
  },
  {
    "id": "53",
    "area": "SALES",
    "station": "bookings",
    "task": "booking-service",
    "f": 3,
    "a": 4,
    "i": 2,
    "s": 3,
    "currentOwner": "",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Delegate-Automate",
    "reasons": "High A 5, S=3",
    "notes": "Frustrating (Savvy), Impact Growth,Not Built (-20%)"
  },
  {
    "id": "54",
    "area": "SALES",
    "station": "gallery-store",
    "task": "gallery-tasks",
    "f": 1,
    "a": 3,
    "i": 2,
    "s": 2,
    "currentOwner": "",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "On-Hold",
    "reasons": "Mid DPS",
    "notes": "Impact Growth, Difficult, No Space (-20%)"
  },
  {
    "id": "55",
    "area": "PERSONAL",
    "station": "family",
    "task": "time-expenses",
    "f": 4,
    "a": 4,
    "i": 1,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "High DPS, High F+A",
    "notes": "Frequent. Frustrating (Expenses), Critical"
  },
  {
    "id": "56",
    "area": "PERSONAL",
    "station": "food",
    "task": "buy-food",
    "f": 3,
    "a": 3,
    "i": 1,
    "s": 4,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "High DPS",
    "notes": "Critical"
  },
  {
    "id": "57",
    "area": "PERSONAL",
    "station": "health",
    "task": "exercise",
    "f": 5,
    "a": 2,
    "i": 2,
    "s": 5,
    "currentOwner": "Founder",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Keep",
    "reasons": "",
    "notes": "Daily, Impact Growth (Personal)"
  },
  {
    "id": "58",
    "area": "PERSONAL",
    "station": "earnings",
    "task": "finances-p",
    "f": 2,
    "a": 3,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "S=3",
    "notes": "Pixelbrain Not Ready"
  },
  {
    "id": "59",
    "area": "PERSONAL",
    "station": "transport-p",
    "task": "vehicle-expenses",
    "f": 3,
    "a": 3,
    "i": 1,
    "s": 3,
    "currentOwner": "Co-Mechanic",
    "idealOwner": "",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Worked",
    "reasons": "S=3",
    "notes": "Critical"
  },
  {
    "id": "60",
    "area": "PERSONAL",
    "station": "rent-p",
    "task": "pay-services-p",
    "f": 1,
    "a": 3,
    "i": 1,
    "s": 4,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "High A 4, S=4",
    "notes": "Critical"
  },
  {
    "id": "61",
    "area": "PERSONAL",
    "station": "rent-p",
    "task": "pay-rent-p",
    "f": 1,
    "a": 3,
    "i": 1,
    "s": 4,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Automate",
    "reasons": "High A 4, S=4",
    "notes": "Critical"
  },
  {
    "id": "62",
    "area": "PERSONAL",
    "station": "other-p",
    "task": "cook",
    "f": 5,
    "a": 5,
    "i": 1,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Cook",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "High DPS, High F+A",
    "notes": "Daily., Soul-Crush, Critical"
  },
  {
    "id": "63",
    "area": "PERSONAL",
    "station": "other-p",
    "task": "laundry",
    "f": 3,
    "a": 4,
    "i": 1,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Cleaner",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "Low I 1 + High A 4",
    "notes": "Frustrating (Time), Impact Growth"
  },
  {
    "id": "64",
    "area": "PERSONAL",
    "station": "other-p",
    "task": "clean-home",
    "f": 4,
    "a": 5,
    "i": 2,
    "s": 3,
    "currentOwner": "Founder",
    "idealOwner": "Co-Cleaner",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "High DPS, High F+A",
    "notes": "Frequent, Soul-Crush, Impact Growth"
  },
  {
    "id": "65",
    "area": "PERSONAL",
    "station": "other-p",
    "task": "legal-paperwork-p",
    "f": 1,
    "a": 5,
    "i": 2,
    "s": 1,
    "currentOwner": "Founder",
    "idealOwner": "Co-Lawyer",
    "doc": "N",
    "feed": "N",
    "delegation": "Co-Work",
    "reasons": "High DPS, High A 5",
    "notes": "Soul-Crush, Impact Growth, Poorly Executed (-10%)"
  },
  {
    "id": "66",
    "area": "PERSONAL",
    "station": "other-p",
    "task": "trading",
    "f": 4,
    "a": 2,
    "i": 2,
    "s": 0,
    "currentOwner": "Founder",
    "idealOwner": "Co-Pixelbrain",
    "doc": "N",
    "feed": "N",
    "delegation": "Automate",
    "reasons": "Mid DPS + Low A",
    "notes": "Frequent, Pixelbrain Not Ready"
  }
];

function SortableRow({
  task, dps, statusScore, statusColor, computedDelegation, computedDelegationColor, computedReasons,
  taskOptions, characters, handleRealTaskSelect, updateTask, deleteTask, getOwnerDisplay,
  setOwnerModal
}: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: 'relative' as React.CSSProperties['position'],
    zIndex: isDragging ? 1 : 0,
  };

  return (
    <tr ref={setNodeRef} style={style} className={`border-b hover:bg-muted/20 transition-colors ${isDragging ? 'bg-muted/50' : 'bg-card'}`}>
      <td className="p-1 align-top text-center w-8">
        <div className="flex flex-col items-center justify-start h-full gap-2 mt-1">
          <button {...attributes} {...listeners} className="opacity-50 hover:opacity-100 transition-opacity focus:outline-none cursor-grab active:cursor-grabbing">
            <GripVertical className="h-4 w-4" />
          </button>
          <button onClick={() => deleteTask(task.id)} className="opacity-30 hover:opacity-100 hover:text-red-500 transition-colors focus:outline-none" title="Delete Row">
            <Trash2 className="h-3 w-3" />
          </button>
        </div>
      </td>
      <td className="p-1 align-top">
        <div className="flex gap-1 text-xs mb-1">
          <span className="font-semibold capitalize">{task.area}</span>
          <span className="text-muted-foreground">&gt;</span>
          <span className="italic capitalize">{task.station}</span>
          <span className="text-muted-foreground">&gt;</span>
        </div>
        <SearchableSelect
          value={task.taskId || ''}
          onValueChange={(val) => handleRealTaskSelect(task.id, val)}
          options={taskOptions}
          autoGroupByCategory={true}
          initialLabel={task.task}
          placeholder={task.task}
          className="h-7 text-sm"
          instanceId={`matrix-task-${task.id}`}
        />
      </td>
      <td className="p-1 align-top">
        <Input type="number" min={0} max={5} value={task.f} onChange={(e) => updateTask(task.id, 'f', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
      </td>
      <td className="p-1 align-top">
        <Input type="number" min={0} max={5} value={task.a} onChange={(e) => updateTask(task.id, 'a', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
      </td>
      <td className="p-1 align-top">
        <Input type="number" min={0} max={5} value={task.i} onChange={(e) => updateTask(task.id, 'i', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
      </td>
      <td className="p-1 align-top">
        <Input type="number" min={0} max={5} value={task.s} onChange={(e) => updateTask(task.id, 's', parseInt(e.target.value) || 0)} className="h-7 w-12 px-1 text-center border-transparent hover:border-input" />
      </td>
      <td className="p-1 align-top text-center font-bold bg-muted/30">
        <div className="mt-1">{dps}</div>
      </td>
      <td className="p-1 align-top">
        <button 
          onClick={() => setOwnerModal({ isOpen: true, taskId: task.id, field: 'currentOwner', currentOwnerId: task.currentOwner })}
          className="flex min-h-[28px] w-full items-center gap-1 rounded border border-transparent px-2 py-1 text-xs hover:border-input focus:border-input focus:outline-none transition-colors text-left bg-transparent"
        >
          {getOwnerDisplay(task.currentOwner)}
        </button>
      </td>
      <td className="p-1 align-top">
        <button 
          onClick={() => setOwnerModal({ isOpen: true, taskId: task.id, field: 'idealOwner', currentOwnerId: task.idealOwner })}
          className="flex min-h-[28px] w-full items-center gap-1 rounded border border-transparent px-2 py-1 text-xs hover:border-input focus:border-input focus:outline-none transition-colors text-left bg-transparent"
        >
          {getOwnerDisplay(task.idealOwner)}
        </button>
      </td>
      <td className="p-1 align-top">
        <select 
          value={task.doc} 
          onChange={(e) => updateTask(task.id, 'doc', e.target.value)}
          className="w-full h-7 text-center bg-transparent border border-transparent hover:border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring text-foreground"
        >
          <option value="Y" className="bg-background text-foreground">Y</option>
          <option value="H" className="bg-background text-foreground">H</option>
          <option value="N" className="bg-background text-foreground">N</option>
        </select>
      </td>
      <td className="p-1 align-top">
        <select 
          value={task.feed} 
          onChange={(e) => updateTask(task.id, 'feed', e.target.value)}
          className="w-full h-7 text-center bg-transparent border border-transparent hover:border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring text-foreground"
        >
          <option value="Y" className="bg-background text-foreground">Y</option>
          <option value="N" className="bg-background text-foreground">N</option>
        </select>
      </td>
      <td className="p-1 align-top">
        <div className={`mt-1 px-2 text-sm font-semibold italic ${computedDelegationColor}`}>{computedDelegation}</div>
      </td>
      <td className="p-1 align-top text-center">
        <div className="mt-1"><span className={statusColor}>{statusScore}%</span></div>
      </td>
      <td className="p-1 align-top">
        <div className="mt-1 px-2 text-sm text-muted-foreground leading-tight">{computedReasons}</div>
      </td>
    </tr>
  );
}

export function DelegationMatrixTab() {
  const [tasks, setTasks] = useState<MatrixTask[]>(INITIAL_MOCK_DATA);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [isEditingRules, setIsEditingRules] = useState(false);
  const [tempRules, setTempRules] = useState(DEFAULT_RULES);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  const [ownerModal, setOwnerModal] = useState<{
    isOpen: boolean;
    taskId: string;
    field: 'currentOwner' | 'idealOwner';
    currentOwnerId: string | null;
  }>({ isOpen: false, taskId: '', field: 'currentOwner', currentOwnerId: null });

  React.useEffect(() => {
    ClientAPI.getCharacters().then(setCharacters).catch(console.error);
    ClientAPI.getTasks().then(tasks => setAllTasks(tasks)).catch(console.error);
    
    ClientAPI.getMatrixState().then(state => {
      if (state.rules) {
        setRules(state.rules);
        setTempRules(state.rules);
      }
      if (state.tasks) {
        setTasks(state.tasks);
      }
    }).catch(console.error);
  }, []);

  const saveTasks = (newTasks: MatrixTask[] | ((prev: MatrixTask[]) => MatrixTask[])) => {
    setTasks((prev) => {
      const updated = typeof newTasks === 'function' ? newTasks(prev) : newTasks;
      ClientAPI.saveMatrixState({ tasks: updated, rules }).catch(console.error);
      return updated;
    });
  };

  const saveRules = () => {
    setRules(tempRules);
    ClientAPI.saveMatrixState({ tasks, rules: tempRules }).catch(console.error);
    setIsEditingRules(false);
  };

  const cancelEditRules = () => {
    setTempRules(rules);
    setIsEditingRules(false);
  };

  const taskOptions = React.useMemo(() => {
    return allTasks.map(t => ({
      value: t.id,
      label: t.name,
      group: t.station ? (t.station.charAt(0).toUpperCase() + t.station.slice(1)) : 'Unassigned'
    }));
  }, [allTasks]);

  const getAreaForStation = (stationStr: string) => {
    for (const [area, stations] of Object.entries(STATION_CATEGORIES)) {
      if ((stations as readonly string[]).includes(stationStr)) {
        return area;
      }
    }
    return '';
  };

  const handleRealTaskSelect = (matrixTaskId: string, selectedTaskId: string) => {
    const realTask = allTasks.find(t => t.id === selectedTaskId);
    if (realTask) {
      let currentOwnerString = '';
      if (realTask.ownerId) {
         const ownerIds = Array.isArray(realTask.ownerId) ? realTask.ownerId : [realTask.ownerId];
         currentOwnerString = ownerIds.join(',');
      }

      saveTasks(prev => prev.map(t => {
        if (t.id !== matrixTaskId) return t;
        const newArea = realTask.station ? getAreaForStation(realTask.station) : t.area;
        return {
          ...t,
          taskId: selectedTaskId,
          station: realTask.station || t.station,
          area: newArea || t.area,
          currentOwner: currentOwnerString || t.currentOwner,
        };
      }));
    }
  };

  const getOwnerDisplay = (idOrName: string) => {
    if (!idOrName) return <span className="text-muted-foreground opacity-50">Unassigned</span>;
    const owners = idOrName.split(',').map(s => s.trim());
    return (
      <div className="flex flex-col gap-1">
        {owners.map((owner, i) => {
          const char = characters.find(c => c.id === owner || c.name === owner);
          return (
            <Badge key={i} variant="secondary" className="px-1 text-[10px] h-4 leading-none py-0 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-full">
              {char ? char.name : owner}
            </Badge>
          );
        })}
      </div>
    );
  };

  const handleOwnerSelect = async (characterIds: string[]) => {
    if (ownerModal.taskId) {
      const ownerString = characterIds.join(',');
      updateTask(ownerModal.taskId, ownerModal.field, ownerString);
      
      // If it's linked to a real task and we are changing currentOwner, update DB
      if (ownerModal.field === 'currentOwner') {
        const matrixTask = tasks.find(t => t.id === ownerModal.taskId);
        if (matrixTask && matrixTask.taskId) {
          const realTask = allTasks.find(t => t.id === matrixTask.taskId);
          if (realTask) {
            try {
              const newOwnerId = characterIds.length === 1 ? characterIds[0] : characterIds;
              const updatedTask = await ClientAPI.upsertTask({ ...realTask, ownerId: newOwnerId });
              setAllTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
            } catch (e) {
              console.error("Failed to update task owner in DB", e);
            }
          }
        }
      }
    }
  };

  const calculateStatus = (task: MatrixTask) => {
    let score = 100;
    const p = rules.statusPenalties as any;
    
    if (task.doc === 'N') score -= p.noDoc;
    if (task.doc === 'H') score -= (p.halfDoc ?? 10);
    if (task.feed === 'N') score -= p.noFeed;
    
    const hasCurrent = task.currentOwner && task.currentOwner.trim() !== '';
    const hasIdeal = task.idealOwner && task.idealOwner.trim() !== '';

    if (!hasCurrent) {
      score -= p.noCurrentOwner;
    }
    
    if ((hasCurrent || hasIdeal) && task.currentOwner !== task.idealOwner) {
      score -= p.mismatchIdealCurrent;
      if (task.f >= p.mismatchFThreshold) score -= p.mismatchFPenalty;
      if (task.a >= p.mismatchAThreshold) score -= p.mismatchAPenalty;
      if (task.i <= p.mismatchIThreshold) score -= p.mismatchIPenalty;
      if (task.s <= p.mismatchSThreshold) score -= p.mismatchSPenalty;
    }
    
    return Math.max(0, score);
  };

  const getStatusColor = (score: number) => {
    if (score >= 90) return 'text-cyan-500 font-bold';
    if (score >= 70) return 'text-green-500 font-bold';
    if (score >= 50) return 'text-yellow-500 font-bold';
    if (score >= 30) return 'text-orange-500 font-bold';
    if (score >= 10) return 'text-red-500 font-bold';
    return 'text-gray-500 font-bold';
  };

  const updateTask = (id: string, field: keyof MatrixTask, value: any) => {
    saveTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const requestDeleteTask = (id: string) => {
    setTaskToDelete(id);
  };

  const confirmDeleteTask = () => {
    if (taskToDelete) {
      saveTasks(prev => prev.filter(t => t.id !== taskToDelete));
      setTaskToDelete(null);
    }
  };

  const moveRowUp = (index: number) => {
    if (index === 0) return;
    saveTasks(prev => {
      const newTasks = [...prev];
      const temp = newTasks[index - 1];
      newTasks[index - 1] = newTasks[index];
      newTasks[index] = temp;
      return newTasks;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      saveTasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const calculateDelegation = (task: MatrixTask, dps: number) => {
    const getOwnerNames = (ownerString: string) => {
      if (!ownerString) return [];
      return ownerString.split(',').map(s => {
        const trimmed = s.trim();
        const char = characters.find(c => c.id === trimmed || c.name === trimmed);
        return char ? char.name.toLowerCase() : trimmed.toLowerCase();
      });
    };

    const currentNames = getOwnerNames(task.currentOwner);
    const idealNames = getOwnerNames(task.idealOwner);

    if (idealNames.length === 0) return { text: 'Keep', color: 'text-cyan-500 font-bold' };

    const idealHasFounder = idealNames.some(n => n.includes(rules.delegation.targetFounder) || n.includes('founder'));
    const idealHasAI = idealNames.some(n => n.includes(rules.delegation.targetAI));
    
    // Check if exactly same sets
    const isCurrentEqualIdeal = 
      currentNames.length > 0 && 
      currentNames.length === idealNames.length && 
      currentNames.every(n => idealNames.includes(n));

    const hasMultipleIdeal = idealNames.length > 1;

    // COMPLETED (Current == Ideal)
    if (isCurrentEqualIdeal) {
      if (idealHasFounder) {
        let text = '';
        if (!hasMultipleIdeal) text = 'Kept';
        else text = idealHasAI ? 'Co-Automated' : 'Co-Worked';
        return { text, color: 'text-cyan-500 font-bold' };
      } else {
        let text = '';
        if (idealHasAI) text = hasMultipleIdeal ? 'Co-Automated' : 'Automated';
        else text = hasMultipleIdeal ? 'Co-Delegated' : 'Delegated';
        return { text, color: 'text-purple-500 font-bold' };
      }
    }

    // ACTION NEEDED (Current != Ideal)
    // Always Orange
    let text = '';
    if (idealHasFounder) {
      if (!hasMultipleIdeal) text = 'Keep';
      else text = idealHasAI ? 'Co-Automate' : 'Co-Work';
    } else {
      if (idealHasAI) text = hasMultipleIdeal ? 'Co-Automate' : 'Automate';
      else text = hasMultipleIdeal ? 'Co-Delegate' : 'Delegate';
    }
    return { text, color: 'text-orange-500 font-bold' };
  };

  const calculateReasons = (task: MatrixTask, dps: number) => {
    const d = rules.delegation;
    const reasons: string[] = [];
    
    // Human readable mapping for the reasons
    if (dps >= d.highDpsMin) reasons.push('High Friction/Priority');
    else if (dps >= d.midDpsMin && dps <= d.midDpsMax) reasons.push('Moderate Friction');
    else reasons.push('Low Friction');

    if (task.a >= rules.statusPenalties.mismatchAThreshold) {
      reasons.push('Frustrating to do');
    }

    if (task.i <= rules.statusPenalties.mismatchIThreshold) {
       reasons.push('Critical for Growth');
    }

    if (task.s >= 3) { // Legacy rule just for reasons display
       reasons.push(`Easily Proceduralized`);
    }
    
    if (task.currentOwner && task.idealOwner && task.currentOwner !== task.idealOwner) {
       reasons.push('Owner Mismatch');
    }
    
    return reasons.join('. ');
  };

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedTasks = React.useMemo(() => {
    if (!sortConfig) return tasks;
    return [...tasks].sort((a, b) => {
      const { key, direction } = sortConfig;
      
      let aVal: any = a[key as keyof MatrixTask];
      let bVal: any = b[key as keyof MatrixTask];

      if (key === 'area') {
        aVal = `${a.area} ${a.station} ${a.task}`;
        bVal = `${b.area} ${b.station} ${b.task}`;
      } else if (key === 'dps') {
        const aDps = a.f + a.a + a.i + a.s;
        const bDps = b.f + b.a + b.i + b.s;
        aVal = aDps;
        bVal = bDps;
      } else if (key === 'delegation') {
        aVal = calculateDelegation(a, a.f + a.a + a.i + a.s).text;
        bVal = calculateDelegation(b, b.f + b.a + b.i + b.s).text;
      } else if (key === 'status') {
        aVal = calculateStatus(a);
        bVal = calculateStatus(b);
      } else if (key === 'currentOwner') {
        aVal = typeof getOwnerDisplay(a.currentOwner) === 'string' ? getOwnerDisplay(a.currentOwner) : a.currentOwner;
        bVal = typeof getOwnerDisplay(b.currentOwner) === 'string' ? getOwnerDisplay(b.currentOwner) : b.currentOwner;
      } else if (key === 'idealOwner') {
        aVal = typeof getOwnerDisplay(a.idealOwner) === 'string' ? getOwnerDisplay(a.idealOwner) : a.idealOwner;
        bVal = typeof getOwnerDisplay(b.idealOwner) === 'string' ? getOwnerDisplay(b.idealOwner) : b.idealOwner;
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }

      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tasks, sortConfig, rules, characters, calculateDelegation, calculateStatus]);

  const renderSortIndicator = (key: string) => {
    if (sortConfig?.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Task Delegation Matrix</CardTitle>
            <CardDescription>
              Identify and evaluate tasks to determine if they should be Kept, Delegated, or Automated.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={async () => {
                const btn = document.getElementById('export-btn');
                if (btn) btn.innerText = 'Exporting...';
                try {
                  await ClientAPI.exportDelegationMatrix({ tasks, rules });
                  if (btn) btn.innerText = 'Exported!';
                  setTimeout(() => { if (btn) btn.innerText = 'Export to Library'; }, 2000);
                } catch(e) {
                  console.error(e);
                  if (btn) btn.innerText = 'Error';
                  setTimeout(() => { if (btn) btn.innerText = 'Export to Library'; }, 2000);
                }
              }}
              id="export-btn"
              className="px-3 py-1 bg-secondary text-secondary-foreground text-sm font-medium rounded hover:bg-secondary/80"
            >
              Export to Library
            </button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left font-medium cursor-pointer hover:bg-muted/80" onClick={() => requestSort('area')}>Area &gt; Station &gt; Task{renderSortIndicator('area')}</th>
                <th className="p-2 text-center font-medium w-12 cursor-pointer hover:bg-muted/80" title="Frequency" onClick={() => requestSort('f')}>F{renderSortIndicator('f')}</th>
                <th className="p-2 text-center font-medium w-12 cursor-pointer hover:bg-muted/80" title="Annoyance" onClick={() => requestSort('a')}>A{renderSortIndicator('a')}</th>
                <th className="p-2 text-center font-medium w-12 cursor-pointer hover:bg-muted/80" title="Impact" onClick={() => requestSort('i')}>I{renderSortIndicator('i')}</th>
                <th className="p-2 text-center font-medium w-12 cursor-pointer hover:bg-muted/80" title="Simplicity" onClick={() => requestSort('s')}>S{renderSortIndicator('s')}</th>
                <th className="p-2 text-center font-medium w-16 bg-muted/80 cursor-pointer hover:bg-muted/100" onClick={() => requestSort('dps')}>DPS{renderSortIndicator('dps')}</th>
                <th className="p-2 text-left font-medium w-32 cursor-pointer hover:bg-muted/80" onClick={() => requestSort('currentOwner')}>Current Owner{renderSortIndicator('currentOwner')}</th>
                <th className="p-2 text-left font-medium w-32 cursor-pointer hover:bg-muted/80" onClick={() => requestSort('idealOwner')}>Ideal Owner{renderSortIndicator('idealOwner')}</th>
                <th className="p-2 text-center font-medium w-12 cursor-pointer hover:bg-muted/80" onClick={() => requestSort('doc')}>Doc?{renderSortIndicator('doc')}</th>
                <th className="p-2 text-center font-medium w-12 cursor-pointer hover:bg-muted/80" onClick={() => requestSort('feed')}>Feed?{renderSortIndicator('feed')}</th>
                <th className="p-2 text-left font-medium cursor-pointer hover:bg-muted/80" onClick={() => requestSort('delegation')}>Delegation{renderSortIndicator('delegation')}</th>
                <th className="p-2 text-center font-medium w-20 cursor-pointer hover:bg-muted/80" onClick={() => requestSort('status')}>Status{renderSortIndicator('status')}</th>
                <th className="p-2 text-left font-medium">Reasons</th>
              </tr>
            </thead>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={sortedTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {sortedTasks.map((task, index) => {
                    const dps = task.f + task.a + task.i + task.s;
                    const statusScore = calculateStatus(task);
                    const statusColor = getStatusColor(statusScore);
                    const computedDelegation = calculateDelegation(task, dps);
                    const computedReasons = calculateReasons(task, dps);

                    return (
                      <SortableRow
                        key={task.id}
                        task={task}
                        index={index}
                        dps={dps}
                        statusScore={statusScore}
                        statusColor={statusColor}
                        computedDelegation={computedDelegation.text}
                        computedDelegationColor={computedDelegation.color}
                        computedReasons={computedReasons}
                        taskOptions={taskOptions}
                        characters={characters}
                        handleRealTaskSelect={handleRealTaskSelect}
                        updateTask={updateTask}
                        deleteTask={requestDeleteTask}
                        getOwnerDisplay={getOwnerDisplay}
                        setOwnerModal={setOwnerModal}
                      />
                    );
                  })}
                </tbody>
              </SortableContext>
            </DndContext>
          </table>
          
          <div className="mt-4 flex justify-end">
             <button 
                onClick={() => saveTasks([...tasks, { id: Date.now().toString(), area: 'NEW', station: 'station', task: 'new-task', f: 0, a: 0, i: 0, s: 0, currentOwner: '', idealOwner: '', doc: 'N', feed: 'N', delegation: 'Keep', reasons: '', notes: '' }])}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
             >
                + Add Task Row
             </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Legend & Math</CardTitle>
          <div className="flex gap-2">
            {!isEditingRules ? (
              <button 
                onClick={() => setIsEditingRules(true)}
                className="text-xs flex items-center gap-1 px-3 py-1.5 border rounded-md hover:bg-muted font-medium transition-colors"
              >
                Edit Rules
              </button>
            ) : (
              <>
                <button 
                  onClick={cancelEditRules}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 border rounded-md hover:bg-muted font-medium transition-colors"
                >
                  <X className="h-3 w-3" /> Cancel
                </button>
                <button 
                  onClick={saveRules}
                  className="text-xs flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md font-medium transition-colors"
                >
                  <CheckCircle className="h-3 w-3" /> Save
                </button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isEditingRules ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="space-y-2">
                <h4 className="font-semibold border-b pb-1">Points Legend (0-5)</h4>
                <p><strong>F (Frequency):</strong> {rules.pointsLegend.f}</p>
                <p><strong>A (Annoyance):</strong> {rules.pointsLegend.a}</p>
                <p><strong>I (Impact):</strong> {rules.pointsLegend.i}</p>
                <p><strong>S (Simplicity):</strong> {rules.pointsLegend.s}</p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold border-b pb-1">Status Calculation</h4>
                <p>Base is 100%. Penalties apply cumulatively:</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>No Doc: <strong>-{rules.statusPenalties.noDoc}%</strong></li>
                  <li>Half Doc: <strong>-{(rules.statusPenalties as any).halfDoc ?? 10}%</strong></li>
                  <li>No Feed: <strong>-{rules.statusPenalties.noFeed}%</strong></li>
                  <li>No Current Owner: <strong>-{rules.statusPenalties.noCurrentOwner}%</strong></li>
                  <li>Ideal != Current: <strong>-{rules.statusPenalties.mismatchIdealCurrent}%</strong></li>
                  <li>+ Mismatch & F≥{rules.statusPenalties.mismatchFThreshold}: <strong>-{rules.statusPenalties.mismatchFPenalty}%</strong></li>
                  <li>+ Mismatch & A≥{rules.statusPenalties.mismatchAThreshold}: <strong>-{rules.statusPenalties.mismatchAPenalty}%</strong></li>
                  <li>+ Mismatch & I≤{rules.statusPenalties.mismatchIThreshold}: <strong>-{rules.statusPenalties.mismatchIPenalty}%</strong></li>
                  <li>+ Mismatch & S≤{rules.statusPenalties.mismatchSThreshold}: <strong>-{rules.statusPenalties.mismatchSPenalty}%</strong></li>
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold border-b pb-1">Color Status</h4>
                <div className="flex flex-col gap-1 mt-2">
                  <span className="text-cyan-500 font-bold">90-100% (Cyan)</span>
                  <span className="text-green-500 font-bold">70-80% (Green)</span>
                  <span className="text-yellow-500 font-bold">50-60% (Yellow)</span>
                  <span className="text-orange-500 font-bold">30-40% (Orange)</span>
                  <span className="text-red-500 font-bold">10-20% (Red)</span>
                  <span className="text-gray-500 font-bold">0% (Grey)</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold border-b pb-1">Delegation Rules</h4>
                <p><span className="text-cyan-500 font-bold">Cyan (Completed w/ Founder):</span> Current == Ideal</p>
                <ul className="list-disc pl-4 space-y-1 mt-0">
                  <li><strong>Kept:</strong> Ideal is only &apos;{rules.delegation.targetFounder}&apos;</li>
                  <li><strong>Co-Worked:</strong> Ideal has multiple, including &apos;{rules.delegation.targetFounder}&apos;</li>
                  <li><strong>Co-Automated:</strong> Ideal has Founder + &apos;{rules.delegation.targetAI}&apos;</li>
                </ul>
                <p><span className="text-purple-500 font-bold">Purple (Completed, No Founder):</span> Current == Ideal</p>
                <ul className="list-disc pl-4 space-y-1 mt-0">
                  <li><strong>Automated:</strong> Ideal has &apos;{rules.delegation.targetAI}&apos;</li>
                  <li><strong>Delegated:</strong> Ideal doesn&apos;t have &apos;{rules.delegation.targetAI}&apos;</li>
                </ul>
                <p><span className="text-orange-500 font-bold">Orange (Action Needed):</span> Current != Ideal</p>
                <ul className="list-disc pl-4 space-y-1 mt-0">
                  <li><strong>Keep:</strong> Ideal is only &apos;{rules.delegation.targetFounder}&apos;</li>
                  <li><strong>Automate:</strong> Ideal has &apos;{rules.delegation.targetAI}&apos;</li>
                  <li><strong>Delegate:</strong> Ideal doesn&apos;t have &apos;{rules.delegation.targetAI}&apos;</li>
                  <li><strong>Co-:</strong> Ideal has multiple characters</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
              <div className="space-y-3">
                <h4 className="font-semibold border-b pb-1">Edit Points Legend</h4>
                <div className="space-y-2">
                  <label className="text-xs font-semibold">F (Frequency)</label>
                  <Input className="h-8 text-xs" value={tempRules.pointsLegend.f} onChange={e => setTempRules({...tempRules, pointsLegend: {...tempRules.pointsLegend, f: e.target.value}})} />
                  <label className="text-xs font-semibold">A (Annoyance)</label>
                  <Input className="h-8 text-xs" value={tempRules.pointsLegend.a} onChange={e => setTempRules({...tempRules, pointsLegend: {...tempRules.pointsLegend, a: e.target.value}})} />
                  <label className="text-xs font-semibold">I (Impact)</label>
                  <Input className="h-8 text-xs" value={tempRules.pointsLegend.i} onChange={e => setTempRules({...tempRules, pointsLegend: {...tempRules.pointsLegend, i: e.target.value}})} />
                  <label className="text-xs font-semibold">S (Simplicity)</label>
                  <Input className="h-8 text-xs" value={tempRules.pointsLegend.s} onChange={e => setTempRules({...tempRules, pointsLegend: {...tempRules.pointsLegend, s: e.target.value}})} />
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold border-b pb-1">Edit Status Penalties</h4>
                <div className="space-y-2 grid grid-cols-2 gap-x-2">
                  <div>
                    <label className="text-xs font-semibold block">No Doc</label>
                    <Input type="number" className="h-8 text-xs" value={tempRules.statusPenalties.noDoc} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, noDoc: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block">Half Doc</label>
                    <Input type="number" className="h-8 text-xs" value={(tempRules.statusPenalties as any).halfDoc ?? 10} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, halfDoc: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block">No Feed</label>
                    <Input type="number" className="h-8 text-xs" value={tempRules.statusPenalties.noFeed} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, noFeed: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block">No Owner</label>
                    <Input type="number" className="h-8 text-xs" value={tempRules.statusPenalties.noCurrentOwner} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, noCurrentOwner: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold block">Ideal != Curr</label>
                    <Input type="number" className="h-8 text-xs" value={tempRules.statusPenalties.mismatchIdealCurrent} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchIdealCurrent: parseInt(e.target.value)||0}})} />
                  </div>
                </div>
                <div className="space-y-2 grid grid-cols-2 gap-x-2 pt-2 border-t">
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Mismatch F &ge;</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchFThreshold} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchFThreshold: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Penalty</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchFPenalty} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchFPenalty: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Mismatch A &ge;</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchAThreshold} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchAThreshold: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Penalty</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchAPenalty} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchAPenalty: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Mismatch I &le;</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchIThreshold} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchIThreshold: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Penalty</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchIPenalty} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchIPenalty: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Mismatch S &le;</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchSThreshold} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchSThreshold: parseInt(e.target.value)||0}})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold block leading-tight">Penalty</label>
                    <Input type="number" className="h-7 text-xs" value={tempRules.statusPenalties.mismatchSPenalty} onChange={e => setTempRules({...tempRules, statusPenalties: {...tempRules.statusPenalties, mismatchSPenalty: parseInt(e.target.value)||0}})} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold border-b pb-1">Color Status</h4>
                <div className="flex flex-col gap-1 mt-2 text-muted-foreground italic text-xs">
                  (Color customization not yet available in this build)
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold border-b pb-1">Edit Delegation Targets & Config</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold whitespace-nowrap">Target Founder Name:</label>
                    <Input className="h-7 text-xs w-32" value={tempRules.delegation.targetFounder} onChange={e => setTempRules({...tempRules, delegation: {...tempRules.delegation, targetFounder: e.target.value.toLowerCase()}})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold whitespace-nowrap">Target AI Name:</label>
                    <Input className="h-7 text-xs w-32" value={tempRules.delegation.targetAI} onChange={e => setTempRules({...tempRules, delegation: {...tempRules.delegation, targetAI: e.target.value.toLowerCase()}})} />
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-4">
                    <label className="text-xs font-semibold whitespace-nowrap">High DPS Min:</label>
                    <Input type="number" className="h-7 text-xs w-20" value={tempRules.delegation.highDpsMin} onChange={e => setTempRules({...tempRules, delegation: {...tempRules.delegation, highDpsMin: parseInt(e.target.value)||0}})} />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-semibold whitespace-nowrap">Mid DPS Range:</label>
                    <div className="flex gap-1 w-20">
                      <Input type="number" className="h-7 text-xs w-9 px-1" value={tempRules.delegation.midDpsMin} onChange={e => setTempRules({...tempRules, delegation: {...tempRules.delegation, midDpsMin: parseInt(e.target.value)||0}})} />
                      <span className="text-xs">-</span>
                      <Input type="number" className="h-7 text-xs w-9 px-1" value={tempRules.delegation.midDpsMax} onChange={e => setTempRules({...tempRules, delegation: {...tempRules.delegation, midDpsMax: parseInt(e.target.value)||0}})} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">Names calculate Delegation (Cyan/Orange/Purple). DPS ranges calculate &apos;Reasons&apos; friction strings.</p>
                </div>
              </div>

            </div>
          )}
        </CardContent>
      </Card>

      <OwnerSelectorModal
        open={ownerModal.isOpen}
        onOpenChange={(isOpen) => setOwnerModal(prev => ({ ...prev, isOpen }))}
        onMultiSelect={handleOwnerSelect}
        multiSelect={true}
        currentOwnerIds={ownerModal.currentOwnerId 
          ? ownerModal.currentOwnerId.split(',').map(s => {
              const trimmed = s.trim();
              const char = characters.find(c => c.id === trimmed || c.name === trimmed);
              return char ? char.id : null; // ONLY return valid mapped IDs, drop raw names like 'Founder'
            }).filter(Boolean) as string[]
          : []}
      />
      <ConfirmationModal
        open={!!taskToDelete}
        onOpenChange={(open) => !open && setTaskToDelete(null)}
        title="Delete Matrix Row"
        description="Are you sure you want to remove this row from the delegation matrix? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
        onConfirm={confirmDeleteTask}
      />
    </div>
  );
}
