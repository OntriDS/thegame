'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ArrowUp, ArrowDown, MoreVertical } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import OwnerSelectorModal from '@/components/modals/submodals/owner-selector-submodal';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ClientAPI } from '@/lib/client-api';
import { Character, Task } from '@/types/entities';
import { STATION_CATEGORIES } from '@/types/enums';

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
  doc: 'Y' | 'N';
  feed: 'Y' | 'N';
  delegation: string;
  reasons: string;
  notes: string;
  taskId?: string;
}

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
    "idealOwner": "Assistant/Co-Pixelbrain",
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
    "idealOwner": "Delivery + Co-Assistant",
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

export function DelegationMatrixTab() {
  const [tasks, setTasks] = useState<MatrixTask[]>(INITIAL_MOCK_DATA);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [ownerModal, setOwnerModal] = useState<{
    isOpen: boolean;
    taskId: string;
    field: 'currentOwner' | 'idealOwner';
    currentOwnerId: string | null;
  }>({ isOpen: false, taskId: '', field: 'currentOwner', currentOwnerId: null });

  React.useEffect(() => {
    ClientAPI.getCharacters().then(setCharacters).catch(console.error);
    ClientAPI.getTasks().then(setAllTasks).catch(console.error);
  }, []);

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
      setTasks(prev => prev.map(t => {
        if (t.id !== matrixTaskId) return t;
        const newArea = realTask.station ? getAreaForStation(realTask.station) : t.area;
        return {
          ...t,
          taskId: selectedTaskId,
          station: realTask.station || t.station,
          area: newArea || t.area,
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

  const handleOwnerSelect = (characterIds: string[]) => {
    if (ownerModal.taskId) {
      updateTask(ownerModal.taskId, ownerModal.field, characterIds.join(','));
    }
  };

  const calculateStatus = (task: MatrixTask) => {
    let score = 100;
    if (task.doc === 'N') score -= 20;
    if (task.feed === 'N') score -= 10;
    
    const hasCurrent = task.currentOwner && task.currentOwner.trim() !== '';
    const hasIdeal = task.idealOwner && task.idealOwner.trim() !== '';

    if (!hasCurrent) {
      score -= 10;
    }
    
    if ((hasCurrent || hasIdeal) && task.currentOwner !== task.idealOwner) {
      score -= 20;
      if (task.f >= 4) score -= 10;
      if (task.a >= 4) score -= 10;
      if (task.i <= 2) score -= 10;
      if (task.s <= 2) score -= 10;
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
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const moveRowUp = (index: number) => {
    if (index === 0) return;
    setTasks(prev => {
      const newTasks = [...prev];
      const temp = newTasks[index - 1];
      newTasks[index - 1] = newTasks[index];
      newTasks[index] = temp;
      return newTasks;
    });
  };

  const moveRowDown = (index: number) => {
    if (index === tasks.length - 1) return;
    setTasks(prev => {
      const newTasks = [...prev];
      const temp = newTasks[index + 1];
      newTasks[index + 1] = newTasks[index];
      newTasks[index] = temp;
      return newTasks;
    });
  };

  const calculateDelegation = (task: MatrixTask, dps: number) => {
    let del = '';
    if (dps <= 7) del = 'Keep';
    else if (dps >= 8 && dps <= 11) {
      if (task.a >= 2) del = 'Keep';
      else del = 'Delegate';
    } else if (dps >= 12) {
      del = 'Delegate';
    }

    if (task.s >= 3) {
      del = del === 'Keep' ? 'Automate' : del + '-Automate';
    }
    return del;
  };

  const calculateReasons = (task: MatrixTask, dps: number) => {
    const reasons: string[] = [];
    if (dps >= 12) reasons.push('High DPS');
    else if (dps >= 8 && dps <= 11) reasons.push('Mid DPS');
    else reasons.push('Low DPS');

    if (task.a >= 4) {
      if (task.f >= 4) reasons.push('High F+A');
      else reasons.push(`High A ${task.a}`);
    } else if (task.a <= 2) {
      reasons.push(`Low A ${task.a}`);
    }

    if (task.i <= 2) {
       reasons.push(`Low I ${task.i}`);
    }

    if (task.s >= 3) reasons.push(`S=${task.s}`);
    
    return reasons.join(', ');
  };

  const getDelegationColor = (del: string) => {
    if (del === 'Keep') return 'text-cyan-500';
    if (del.includes('Keep') && del.includes('Automate')) return 'text-yellow-500';
    if (del.includes('Delegate') && !del.includes('Automate')) return 'text-orange-500';
    if (del.includes('Delegate') && del.includes('Automate')) return 'text-orange-400';
    if (del === 'Automate') return 'text-purple-500';
    return 'text-primary';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Task Delegation Matrix</CardTitle>
          <CardDescription>
            Identify and evaluate tasks to determine if they should be Kept, Delegated, or Automated.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-2 w-8"></th>
                <th className="p-2 text-left font-medium">Area &gt; Station &gt; Task</th>
                <th className="p-2 text-center font-medium w-12" title="Frequency">F</th>
                <th className="p-2 text-center font-medium w-12" title="Annoyance">A</th>
                <th className="p-2 text-center font-medium w-12" title="Impact">I</th>
                <th className="p-2 text-center font-medium w-12" title="Simplicity">S</th>
                <th className="p-2 text-center font-medium w-16 bg-muted/80">DPS</th>
                <th className="p-2 text-left font-medium w-32">Current Owner</th>
                <th className="p-2 text-left font-medium w-32">Ideal Owner</th>
                <th className="p-2 text-center font-medium w-12">Doc?</th>
                <th className="p-2 text-center font-medium w-12">Feed?</th>
                <th className="p-2 text-left font-medium">Delegation</th>
                <th className="p-2 text-left font-medium">Reasons</th>
                <th className="p-2 text-center font-medium w-20">Status</th>
                <th className="p-2 text-left font-medium min-w-[200px]">Notes</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task, index) => {
                const dps = task.f + task.a + task.i + task.s;
                const statusScore = calculateStatus(task);
                const statusColor = getStatusColor(statusScore);
                const computedDelegation = calculateDelegation(task, dps);
                const computedReasons = calculateReasons(task, dps);

                return (
                  <tr key={task.id} className="border-b hover:bg-muted/20 transition-colors">
                    <td className="p-1 align-top text-center w-8">
                      <DropdownMenu>
                        <DropdownMenuTrigger className="opacity-50 hover:opacity-100 transition-opacity mt-1 focus:outline-none">
                          <MoreVertical className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start">
                          <DropdownMenuItem onClick={() => moveRowUp(index)} disabled={index === 0}>
                            <ArrowUp className="h-4 w-4 mr-2" /> Move Up
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => moveRowDown(index)} disabled={index === tasks.length - 1}>
                            <ArrowDown className="h-4 w-4 mr-2" /> Move Down
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
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
                        className="w-full h-7 text-center bg-transparent border border-transparent hover:border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-1 align-top">
                      <select 
                        value={task.feed} 
                        onChange={(e) => updateTask(task.id, 'feed', e.target.value)}
                        className="w-full h-7 text-center bg-transparent border border-transparent hover:border-input rounded px-1 outline-none focus:ring-1 focus:ring-ring"
                      >
                        <option value="Y">Y</option>
                        <option value="N">N</option>
                      </select>
                    </td>
                    <td className="p-1 align-top">
                      <div className={`mt-1 px-2 text-sm font-semibold italic ${getDelegationColor(computedDelegation)}`}>{computedDelegation}</div>
                    </td>
                    <td className="p-1 align-top">
                      <div className="mt-1 px-2 text-sm text-muted-foreground leading-tight">{computedReasons}</div>
                    </td>
                    <td className="p-1 align-top text-center">
                      <div className="mt-1"><span className={statusColor}>{statusScore}%</span></div>
                    </td>
                    <td className="p-1 align-top">
                      <Input value={task.notes} onChange={(e) => updateTask(task.id, 'notes', e.target.value)} className="h-7 px-2 border-transparent hover:border-input text-sm" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <div className="mt-4 flex justify-end">
             <button 
                onClick={() => setTasks([...tasks, { id: Date.now().toString(), area: 'NEW', station: 'station', task: 'new-task', f: 0, a: 0, i: 0, s: 0, currentOwner: '', idealOwner: '', doc: 'N', feed: 'N', delegation: 'Keep', reasons: '', notes: '' }])}
                className="px-4 py-2 text-sm font-medium border rounded-md hover:bg-muted transition-colors"
             >
                + Add Task Row
             </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Legend & Math</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-sm">
            
            <div className="space-y-2">
              <h4 className="font-semibold border-b pb-1">Points Legend (0-5)</h4>
              <p><strong>F (Frequency):</strong> 5=Daily, 4=Frequent, 3=Weekly, 2=Bi-Weekly, 1=Monthly, 0=Never</p>
              <p><strong>A (Annoyance):</strong> 5=Soul-Crushing, 4=Frustrating, 3=Neutral, 2=Fine, 1=Love it, 0=Mind-Blowing</p>
              <p><strong>I (Impact):</strong> 5=Terrible, 4=Supportive, 3=Necessary, 2=Growth, 1=Critical, 0=Highest Priority</p>
              <p><strong>S (Simplicity):</strong> 5=No-Brainer, 4=Easy, 3=Procedural (SOP), 2=Difficult, 1=Complex, 0=Hardest</p>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold border-b pb-1">Status Calculation</h4>
              <p>Base is 100%. Penalties apply cumulatively:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>No Doc: <strong>-20%</strong></li>
                <li>No Feed: <strong>-10%</strong></li>
                <li>No Current Owner: <strong>-10%</strong></li>
                <li>Ideal != Current: <strong>-20%</strong></li>
                <li>+ Mismatch & F≥4: <strong>-10%</strong></li>
                <li>+ Mismatch & A≥4: <strong>-10%</strong></li>
                <li>+ Mismatch & I≤2: <strong>-10%</strong></li>
                <li>+ Mismatch & S≤2: <strong>-10%</strong></li>
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
              <p><strong>Low DPS (7-):</strong> Keep</p>
              <p><strong>Mid DPS (8-11) + Low A (2+):</strong> Keep</p>
              <p><strong>High DPS (12+):</strong> Delegate</p>
              <p><strong>S=3+ (Procedural):</strong> Automate</p>
            </div>

          </div>
        </CardContent>
      </Card>

      <OwnerSelectorModal
        open={ownerModal.isOpen}
        onOpenChange={(isOpen) => setOwnerModal(prev => ({ ...prev, isOpen }))}
        onMultiSelect={handleOwnerSelect}
        multiSelect={true}
        currentOwnerIds={ownerModal.currentOwnerId ? ownerModal.currentOwnerId.split(',') : []}
      />
    </div>
  );
}
