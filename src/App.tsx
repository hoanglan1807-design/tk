import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Play, Pause, RotateCcw, Search, Info, ChevronRight, CheckCircle2, Target, Layout, Dices, Edit3, ArrowDown, List, GitBranch } from 'lucide-react';

const INITIAL_LINEAR_ARRAY = [2, 8, 5, 1, 6, 4, 6];
const INITIAL_BINARY_ARRAY = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19];
const INITIAL_BST_SEQUENCE = [9, 5, 4, 8, 6, 3, 14, 12, 13];

type Algorithm = 'linear' | 'binary' | 'bst' | 'bst-search' | 'bst-insert' | 'bst-delete';
type View = 'home' | 'visualizer';

interface BSTNode {
  id: number;
  value: number;
  left: number | null;
  right: number | null;
  x: number;
  y: number;
  level: number;
}

export default function App() {
  const [view, setView] = useState<View>('home');
  const [algorithm, setAlgorithm] = useState<Algorithm>('bst');
  const [array, setArray] = useState(INITIAL_BST_SEQUENCE);
  const [arrayInput, setArrayInput] = useState(INITIAL_BST_SEQUENCE.join(', '));
  const [target, setTarget] = useState(6);
  const [targetInput, setTargetInput] = useState('6');
  
  // Shared State
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [foundIndices, setFoundIndices] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stepCount, setStepCount] = useState(0);
  const [message, setMessage] = useState('Nhấn "Bắt đầu" để khởi động.');
  const [isFinished, setIsFinished] = useState(false);
  const [activeCodeLine, setActiveCodeLine] = useState(-1);
  const [speed, setSpeed] = useState(1000);

  // Binary Search Specific State
  const [left, setLeft] = useState(-1);
  const [right, setRight] = useState(-1);
  const [mid, setMid] = useState(-1);

  // BST Specific State
  const [bstNodes, setBstNodes] = useState<BSTNode[]>([]);
  const [bstTraversingId, setBstTraversingId] = useState<number | null>(null);
  const [bstOriginalDeleteId, setBstOriginalDeleteId] = useState<number | null>(null);
  const [bstSequenceIndex, setBstSequenceIndex] = useState(0);
  const [bstSubStep, setBstSubStep] = useState<'picking' | 'comparing' | 'moving' | 'searching' | 'inserting' | 'deleting' | 'finding-successor'>('picking');

  // Refs for precise coordinate calculation
  const containerRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [edges, setEdges] = useState<{x1: number, y1: number, x2: number, y2: number, id: string}[]>([]);

  const updateEdges = useCallback(() => {
    if (!containerRef.current || !algorithm.startsWith('bst')) return;
    
    const containerRect = containerRectRef.current || containerRef.current.getBoundingClientRect();
    const newEdges: {x1: number, y1: number, x2: number, y2: number, id: string}[] = [];

    bstNodes.forEach(node => {
      const parentEl = nodeRefs.current.get(node.id);
      if (!parentEl) return;

      const pRect = parentEl.getBoundingClientRect();
      const pCenterX = pRect.left + pRect.width / 2 - containerRect.left;
      const pCenterY = pRect.top + pRect.height / 2 - containerRect.top;

      if (node.left !== null) {
        const childEl = nodeRefs.current.get(node.left);
        if (childEl) {
          const cRect = childEl.getBoundingClientRect();
          const cCenterX = cRect.left + cRect.width / 2 - containerRect.left;
          const cCenterY = cRect.top + cRect.height / 2 - containerRect.top;
          newEdges.push({ x1: pCenterX, y1: pCenterY, x2: cCenterX, y2: cCenterY, id: `${node.id}-${node.left}` });
        }
      }

      if (node.right !== null) {
        const childEl = nodeRefs.current.get(node.right);
        if (childEl) {
          const cRect = childEl.getBoundingClientRect();
          const cCenterX = cRect.left + cRect.width / 2 - containerRect.left;
          const cCenterY = cRect.top + cRect.height / 2 - containerRect.top;
          newEdges.push({ x1: pCenterX, y1: pCenterY, x2: cCenterX, y2: cCenterY, id: `${node.id}-${node.right}` });
        }
      }
    });

    setEdges(newEdges);
  }, [bstNodes, algorithm]);

  const containerRectRef = useRef<DOMRect | null>(null);

  // Update edges whenever nodes change or window resizes
  useEffect(() => {
    if (algorithm.startsWith('bst')) {
      if (containerRef.current) {
        containerRectRef.current = containerRef.current.getBoundingClientRect();
      }
      // Small delay to ensure DOM is updated
      const timer = setTimeout(updateEdges, 50);
      window.addEventListener('resize', () => {
        if (containerRef.current) containerRectRef.current = containerRef.current.getBoundingClientRect();
        updateEdges();
      });
      return () => {
        clearTimeout(timer);
        window.removeEventListener('resize', updateEdges);
      };
    }
  }, [bstNodes, algorithm, updateEdges]);

  const reset = useCallback(() => {
    setCurrentIndex(-1);
    setFoundIndices([]);
    setLeft(-1);
    setRight(-1);
    setMid(-1);
    setBstNodes([]);
    setBstTraversingId(null);
    setBstOriginalDeleteId(null);
    setBstSequenceIndex(0);
    setBstSubStep('picking');
    setIsPlaying(false);
    setStepCount(0);
    setMessage('Nhấn "Bắt đầu" để khởi động.');
    setIsFinished(false);
    setActiveCodeLine(-1);
    setEdges([]);
  }, []);

  const switchAlgorithm = (type: Algorithm) => {
    setAlgorithm(type);
    setView('visualizer');
    let newArray, newTarget;
    if (type === 'linear') {
      newArray = INITIAL_LINEAR_ARRAY;
      newTarget = 6;
    } else if (type === 'binary') {
      newArray = INITIAL_BINARY_ARRAY;
      newTarget = 13;
    } else if (type === 'bst') {
      newArray = INITIAL_BST_SEQUENCE;
      newTarget = 0;
    } else if (type === 'bst-search') {
      newArray = INITIAL_BST_SEQUENCE;
      newTarget = 6;
    } else if (type === 'bst-insert') {
      newArray = INITIAL_BST_SEQUENCE;
      newTarget = 7;
    } else {
      newArray = INITIAL_BST_SEQUENCE;
      newTarget = 5;
    }
    setArray(newArray);
    setArrayInput(newArray.join(', '));
    setTarget(newTarget);
    setTargetInput(newTarget.toString());
    reset();
  };

  const handleTargetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTargetInput(val);
    const num = parseInt(val);
    if (!isNaN(num)) {
      setTarget(num);
      if (algorithm !== 'bst' && algorithm !== 'bst-insert' && algorithm !== 'bst-delete') reset();
    }
  };

  const handleAddBSTNode = () => {
    if (isNaN(target)) return;
    const newArray = [...array, target];
    setArray(newArray);
    setArrayInput(newArray.join(', '));
    if (isFinished) {
      setIsFinished(false);
      setIsPlaying(true);
    }
  };

  const handleArrayInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setArrayInput(val);
  };

  const applyCustomArray = () => {
    let newArray = arrayInput
      .split(',')
      .map(item => parseInt(item.trim()))
      .filter(item => !isNaN(item));
    
    if (algorithm === 'binary') {
      newArray.sort((a, b) => a - b);
    }
    
    if (newArray.length > 0) {
      setArray(newArray);
      setArrayInput(newArray.join(', '));
      reset();
    }
  };

  const generateRandomArray = () => {
    const length = algorithm === 'bst' ? 9 : (Math.floor(Math.random() * 3) + 7);
    let newArray = Array.from({ length }, () => Math.floor(Math.random() * 50));
    if (algorithm === 'binary') {
      newArray.sort((a, b) => a - b);
    }
    setArray(newArray);
    setArrayInput(newArray.join(', '));
    reset();
  };

  const handleLinearStep = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex >= array.length) {
      setIsFinished(true);
      setIsPlaying(false);
      setActiveCodeLine(-1);
      if (foundIndices.length > 0) {
        setMessage(`Tìm thấy ${target} tại vị trí: ${foundIndices.join(', ')}`);
      } else {
        setMessage(`Không tìm thấy ${target} trong dãy.`);
      }
      return;
    }
    setCurrentIndex(nextIndex);
    setStepCount((prev) => prev + 1);
    setActiveCodeLine(0);
    setTimeout(() => {
      setActiveCodeLine(1);
      setMessage(`Kiểm tra A[${nextIndex}] (${array[nextIndex]}) với X (${target})`);
      if (array[nextIndex] === target) {
        setFoundIndices((prev) => [...prev, nextIndex]);
        setActiveCodeLine(2);
        setMessage(`Tìm thấy ${target} tại vị trí ${nextIndex}!`);
      }
    }, 400);
  }, [currentIndex, array, target, foundIndices]);

  const handleBinaryStep = useCallback(() => {
    if (left === -1) {
      setLeft(0);
      setRight(array.length - 1);
      setStepCount(1);
      setMessage(`Khởi tạo: Left = 0, Right = ${array.length - 1}`);
      setActiveCodeLine(0);
      return;
    }
    if (mid === -1 || (activeCodeLine !== 1 && activeCodeLine !== 2)) {
      const currentMid = Math.floor((left + right) / 2);
      setMid(currentMid);
      setStepCount((prev) => prev + 1);
      setActiveCodeLine(1);
      setMessage(`Tính Mid = (Left + Right) / 2 = ${currentMid}. So sánh A[${currentMid}] (${array[currentMid]}) với X (${target})`);
      return;
    }
    if (array[mid] === target) {
      setFoundIndices([mid]);
      setIsFinished(true);
      setIsPlaying(false);
      setActiveCodeLine(2);
      setMessage(`Tìm thấy ${target} tại vị trí ${mid}!`);
    } else if (left >= right) {
      setIsFinished(true);
      setIsPlaying(false);
      setActiveCodeLine(-1);
      setMessage(`Không tìm thấy ${target} trong dãy.`);
    } else if (array[mid] < target) {
      setLeft(mid + 1);
      setMid(-1);
      setActiveCodeLine(3);
      setMessage(`A[mid] < X (${array[mid]} < ${target}), thu hẹp phạm vi sang phải: Left = mid + 1 = ${mid + 1}`);
    } else {
      setRight(mid - 1);
      setMid(-1);
      setActiveCodeLine(4);
      setMessage(`A[mid] > X (${array[mid]} > ${target}), thu hẹp phạm vi sang trái: Right = mid - 1 = ${mid - 1}`);
    }
  }, [left, right, mid, array, target, activeCodeLine]);

  const calculateNodePos = (level: number, offset: number, parentX: number, parentY: number): { x: number, y: number } => {
    const y = parentY + 12; // Reduced vertical spacing
    const xDist = 35 / Math.pow(2, level); // Reduced horizontal spacing
    const x = parentX + offset * xDist;
    return { x, y };
  };

  const handleBSTStep = useCallback(() => {
    if (bstSequenceIndex >= array.length) {
      setIsFinished(true);
      setIsPlaying(false);
      setMessage("Hoàn tất dựng cây nhị phân tìm kiếm!");
      setActiveCodeLine(-1);
      return;
    }

    const val = array[bstSequenceIndex];

    if (bstSubStep === 'picking') {
      setStepCount(prev => prev + 1);
      if (bstNodes.length === 0) {
        const newNode: BSTNode = { id: 0, value: val, left: null, right: null, x: 50, y: 10, level: 0 };
        setBstNodes([newNode]);
        setBstSequenceIndex(prev => prev + 1);
        setMessage(`Chèn gốc (Root): ${val}`);
        setActiveCodeLine(0);
      } else {
        setBstTraversingId(0);
        setBstSubStep('comparing');
        setMessage(`Bắt đầu từ gốc để chèn ${val}`);
        setActiveCodeLine(1);
      }
      return;
    }

    if (bstSubStep === 'comparing') {
      const currentNode = bstNodes.find(n => n.id === bstTraversingId);
      if (!currentNode) return;

      if (val < currentNode.value) {
        setMessage(`${val} < ${currentNode.value} -> Đi sang TRÁI`);
        setActiveCodeLine(2);
        if (currentNode.left === null) {
          const pos = calculateNodePos(currentNode.level + 1, -1, currentNode.x, currentNode.y);
          const newNode: BSTNode = { id: bstNodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: currentNode.level + 1 };
          currentNode.left = newNode.id;
          setBstNodes([...bstNodes, newNode]);
          setBstSubStep('picking');
          setBstSequenceIndex(prev => prev + 1);
          setBstTraversingId(null);
        } else {
          setBstSubStep('moving');
          setBstTraversingId(currentNode.left);
        }
      } else {
        setMessage(`${val} >= ${currentNode.value} -> Đi sang PHẢI`);
        setActiveCodeLine(3);
        if (currentNode.right === null) {
          const pos = calculateNodePos(currentNode.level + 1, 1, currentNode.x, currentNode.y);
          const newNode: BSTNode = { id: bstNodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: currentNode.level + 1 };
          currentNode.right = newNode.id;
          setBstNodes([...bstNodes, newNode]);
          setBstSubStep('picking');
          setBstSequenceIndex(prev => prev + 1);
          setBstTraversingId(null);
        } else {
          setBstSubStep('moving');
          setBstTraversingId(currentNode.right);
        }
      }
      return;
    }

    if (bstSubStep === 'moving') {
      setBstSubStep('comparing');
      setActiveCodeLine(1);
    }
  }, [bstSequenceIndex, array, bstNodes, bstSubStep, bstTraversingId]);

  const handleBSTSearchStep = useCallback(() => {
    // If tree is not built yet, build it instantly
    if (bstNodes.length === 0) {
      let nodes: BSTNode[] = [];
      const buildTree = (val: number) => {
        if (nodes.length === 0) {
          nodes.push({ id: 0, value: val, left: null, right: null, x: 50, y: 10, level: 0 });
          return;
        }
        let curr = nodes[0];
        while (true) {
          if (val < curr.value) {
            if (curr.left === null) {
              const pos = calculateNodePos(curr.level + 1, -1, curr.x, curr.y);
              const newNode: BSTNode = { id: nodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: curr.level + 1 };
              curr.left = newNode.id;
              nodes.push(newNode);
              break;
            } else {
              curr = nodes.find(n => n.id === curr.left)!;
            }
          } else {
            if (curr.right === null) {
              const pos = calculateNodePos(curr.level + 1, 1, curr.x, curr.y);
              const newNode: BSTNode = { id: nodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: curr.level + 1 };
              curr.right = newNode.id;
              nodes.push(newNode);
              break;
            } else {
              curr = nodes.find(n => n.id === curr.right)!;
            }
          }
        }
      };
      array.forEach(buildTree);
      setBstNodes(nodes);
      setBstTraversingId(0);
      setStepCount(1);
      setMessage(`Bắt đầu tìm kiếm ${target} từ gốc (Root)`);
      setActiveCodeLine(0);
      return;
    }

    const currentNode = bstNodes.find(n => n.id === bstTraversingId);
    if (!currentNode) {
      setIsFinished(true);
      setIsPlaying(false);
      setMessage(`Không tìm thấy ${target} trong cây.`);
      setActiveCodeLine(-1);
      return;
    }

    setStepCount(prev => prev + 1);
    setActiveCodeLine(1);
    setMessage(`So sánh ${target} với nút hiện tại ${currentNode.value}`);

    setTimeout(() => {
      if (target === currentNode.value) {
        setFoundIndices([currentNode.id]);
        setIsFinished(true);
        setIsPlaying(false);
        setActiveCodeLine(2);
        setMessage(`Tìm thấy ${target} tại nút này!`);
      } else if (target < currentNode.value) {
        setActiveCodeLine(3);
        setMessage(`${target} < ${currentNode.value} -> Đi sang TRÁI`);
        if (currentNode.left === null) {
          setIsFinished(true);
          setIsPlaying(false);
          setMessage(`Không tìm thấy ${target} (đã hết nhánh trái).`);
        } else {
          setBstTraversingId(currentNode.left);
        }
      } else {
        setActiveCodeLine(4);
        setMessage(`${target} > ${currentNode.value} -> Đi sang PHẢI`);
        if (currentNode.right === null) {
          setIsFinished(true);
          setIsPlaying(false);
          setMessage(`Không tìm thấy ${target} (đã hết nhánh phải).`);
        } else {
          setBstTraversingId(currentNode.right);
        }
      }
    }, 400);
  }, [bstNodes, array, bstTraversingId, target]);

  const handleBSTInsertStep = useCallback(() => {
    // If tree is not built yet, build it instantly from the array
    if (bstNodes.length === 0) {
      let nodes: BSTNode[] = [];
      const buildTree = (val: number) => {
        if (nodes.length === 0) {
          nodes.push({ id: 0, value: val, left: null, right: null, x: 50, y: 10, level: 0 });
          return;
        }
        let curr = nodes[0];
        while (true) {
          if (val < curr.value) {
            if (curr.left === null) {
              const pos = calculateNodePos(curr.level + 1, -1, curr.x, curr.y);
              const newNode: BSTNode = { id: nodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: curr.level + 1 };
              curr.left = newNode.id;
              nodes.push(newNode);
              break;
            } else {
              curr = nodes.find(n => n.id === curr.left)!;
            }
          } else {
            if (curr.right === null) {
              const pos = calculateNodePos(curr.level + 1, 1, curr.x, curr.y);
              const newNode: BSTNode = { id: nodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: curr.level + 1 };
              curr.right = newNode.id;
              nodes.push(newNode);
              break;
            } else {
              curr = nodes.find(n => n.id === curr.right)!;
            }
          }
        }
      };
      array.forEach(buildTree);
      setBstNodes(nodes);
      setBstTraversingId(0);
      setBstSubStep('inserting');
      setStepCount(1);
      setMessage(`Cây đã có sẵn. Bắt đầu chèn thêm giá trị ${target} từ gốc.`);
      setActiveCodeLine(0);
      return;
    }

    const currentNode = bstNodes.find(n => n.id === bstTraversingId);
    if (!currentNode) return;

    setStepCount(prev => prev + 1);
    setActiveCodeLine(1);
    setMessage(`So sánh ${target} với nút hiện tại ${currentNode.value}`);

    setTimeout(() => {
      if (target < currentNode.value) {
        setActiveCodeLine(2);
        setMessage(`${target} < ${currentNode.value} -> Đi sang TRÁI`);
        if (currentNode.left === null) {
          const pos = calculateNodePos(currentNode.level + 1, -1, currentNode.x, currentNode.y);
          const newNode: BSTNode = { id: bstNodes.length, value: target, left: null, right: null, x: pos.x, y: pos.y, level: currentNode.level + 1 };
          currentNode.left = newNode.id;
          setBstNodes([...bstNodes, newNode]);
          setIsFinished(true);
          setIsPlaying(false);
          setBstTraversingId(newNode.id);
          setMessage(`Đã chèn ${target} vào vị trí mới bên TRÁI của ${currentNode.value}`);
        } else {
          setBstTraversingId(currentNode.left);
        }
      } else {
        setActiveCodeLine(3);
        setMessage(`${target} >= ${currentNode.value} -> Đi sang PHẢI`);
        if (currentNode.right === null) {
          const pos = calculateNodePos(currentNode.level + 1, 1, currentNode.x, currentNode.y);
          const newNode: BSTNode = { id: bstNodes.length, value: target, left: null, right: null, x: pos.x, y: pos.y, level: currentNode.level + 1 };
          currentNode.right = newNode.id;
          setBstNodes([...bstNodes, newNode]);
          setIsFinished(true);
          setIsPlaying(false);
          setBstTraversingId(newNode.id);
          setMessage(`Đã chèn ${target} vào vị trí mới bên PHẢI của ${currentNode.value}`);
        } else {
          setBstTraversingId(currentNode.right);
        }
      }
    }, 400);
  }, [bstNodes, array, bstTraversingId, target]);

  const handleBSTDeleteStep = useCallback(() => {
    // If tree is not built yet, build it instantly from the array
    if (bstNodes.length === 0) {
      let nodes: BSTNode[] = [];
      const buildTree = (val: number) => {
        if (nodes.length === 0) {
          nodes.push({ id: 0, value: val, left: null, right: null, x: 50, y: 10, level: 0 });
          return;
        }
        let curr = nodes[0];
        while (true) {
          if (val < curr.value) {
            if (curr.left === null) {
              const pos = calculateNodePos(curr.level + 1, -1, curr.x, curr.y);
              const newNode: BSTNode = { id: nodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: curr.level + 1 };
              curr.left = newNode.id;
              nodes.push(newNode);
              break;
            } else {
              curr = nodes.find(n => n.id === curr.left)!;
            }
          } else {
            if (curr.right === null) {
              const pos = calculateNodePos(curr.level + 1, 1, curr.x, curr.y);
              const newNode: BSTNode = { id: nodes.length, value: val, left: null, right: null, x: pos.x, y: pos.y, level: curr.level + 1 };
              curr.right = newNode.id;
              nodes.push(newNode);
              break;
            } else {
              curr = nodes.find(n => n.id === curr.right)!;
            }
          }
        }
      };
      array.forEach(buildTree);
      setBstNodes(nodes);
      setBstTraversingId(0);
      setBstSubStep('deleting');
      setStepCount(1);
      setMessage(`Cây đã có sẵn. Bắt đầu tìm nút ${target} để xóa.`);
      setActiveCodeLine(0);
      return;
    }

    if (bstSubStep === 'finding-successor') {
      const currentNode = bstNodes.find(n => n.id === bstTraversingId);
      const originalNode = bstNodes.find(n => n.id === bstOriginalDeleteId);
      if (!currentNode || !originalNode) return;

      setStepCount(prev => prev + 1);
      if (currentNode.left !== null) {
        setBstTraversingId(currentNode.left);
        setMessage(`Tìm nút nhỏ nhất: Di chuyển sang TRÁI đến nút ${bstNodes.find(n => n.id === currentNode.left)?.value}`);
      } else {
        setMessage(`Tìm thấy nút thay thế: ${currentNode.value}. Đây là giá trị nhỏ nhất trong các nút lớn hơn ${originalNode.value}.`);
        setTimeout(() => {
          setMessage(`Thay thế giá trị ${originalNode.value} bằng ${currentNode.value}, sau đó xóa nút ${currentNode.value} ở vị trí cũ.`);
          const successorVal = currentNode.value;
          const successorId = currentNode.id;
          
          const updatedNodes = bstNodes.map(n => n.id === originalNode.id ? { ...n, value: successorVal } : n);
          const finalNodes = updatedNodes.filter(n => n.id !== successorId);
          finalNodes.forEach(n => {
            if (n.left === successorId) n.left = null;
            if (n.right === successorId) n.right = null;
          });
          
          setBstNodes(finalNodes);
          setIsFinished(true);
          setIsPlaying(false);
          setBstOriginalDeleteId(null);
        }, 1500);
      }
      return;
    }

    const currentNode = bstNodes.find(n => n.id === bstTraversingId);
    if (!currentNode) {
      setIsFinished(true);
      setIsPlaying(false);
      setMessage(`Không tìm thấy nút ${target} để xóa.`);
      return;
    }

    setStepCount(prev => prev + 1);
    
    if (target === currentNode.value) {
      setActiveCodeLine(2);
      setMessage(`Đã tìm thấy nút ${target}. Đang kiểm tra số lượng cây con...`);
      
      setTimeout(() => {
        // Case 1: Leaf Node
        if (currentNode.left === null && currentNode.right === null) {
          setMessage(`Nút ${target} là nút lá (không có con). Xóa trực tiếp khỏi cây.`);
          const newNodes = bstNodes.filter(n => n.id !== currentNode.id);
          newNodes.forEach(n => {
            if (n.left === currentNode.id) n.left = null;
            if (n.right === currentNode.id) n.right = null;
          });
          setBstNodes(newNodes);
          setIsFinished(true);
          setIsPlaying(false);
        } 
        // Case 2: One Child
        else if (currentNode.left === null || currentNode.right === null) {
          const childId = currentNode.left !== null ? currentNode.left : currentNode.right;
          const childNode = bstNodes.find(n => n.id === childId);
          setMessage(`Nút ${target} có 1 con (${childNode?.value}). Nối trực tiếp nút con lên thay thế cha.`);
          const newNodes = bstNodes.filter(n => n.id !== currentNode.id);
          newNodes.forEach(n => {
            if (n.left === currentNode.id) n.left = childId;
            if (n.right === currentNode.id) n.right = childId;
          });
          setBstNodes(newNodes);
          setIsFinished(true);
          setIsPlaying(false);
        }
        // Case 3: Two Children
        else {
          setMessage(`Nút ${target} có 2 con. Quy tắc: Tìm nút nhỏ nhất ở cây con bên PHẢI (Inorder Successor) để thay thế.`);
          setBstOriginalDeleteId(currentNode.id);
          setBstSubStep('finding-successor');
          setTimeout(() => {
            setBstTraversingId(currentNode.right);
            setMessage(`Bước 1: Sang PHẢI một bước đến nút ${bstNodes.find(n => n.id === currentNode.right)?.value}.`);
          }, 1000);
        }
      }, 1000);
    } else if (target < currentNode.value) {
      setActiveCodeLine(3);
      setMessage(`${target} < ${currentNode.value} -> Tìm ở nhánh TRÁI`);
      if (currentNode.left === null) {
        setIsFinished(true);
        setIsPlaying(false);
        setMessage(`Không tìm thấy nút ${target} (đã hết nhánh trái).`);
      } else {
        setBstTraversingId(currentNode.left);
      }
    } else {
      setActiveCodeLine(4);
      setMessage(`${target} > ${currentNode.value} -> Tìm ở nhánh PHẢI`);
      if (currentNode.right === null) {
        setIsFinished(true);
        setIsPlaying(false);
        setMessage(`Không tìm thấy nút ${target} (đã hết nhánh phải).`);
      } else {
        setBstTraversingId(currentNode.right);
      }
    }
  }, [bstNodes, array, bstTraversingId, target, bstSubStep, bstOriginalDeleteId]);

  const handleNextStep = useCallback(() => {
    if (isFinished) return;
    if (algorithm === 'linear') handleLinearStep();
    else if (algorithm === 'binary') handleBinaryStep();
    else if (algorithm === 'bst') handleBSTStep();
    else if (algorithm === 'bst-search') handleBSTSearchStep();
    else if (algorithm === 'bst-insert') handleBSTInsertStep();
    else handleBSTDeleteStep();
  }, [isFinished, algorithm, handleLinearStep, handleBinaryStep, handleBSTStep, handleBSTSearchStep, handleBSTInsertStep, handleBSTDeleteStep]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying && !isFinished) {
      timer = setInterval(() => {
        handleNextStep();
      }, speed);
    }
    return () => clearInterval(timer);
  }, [isPlaying, isFinished, handleNextStep, speed]);

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] font-sans flex flex-col">
      <AnimatePresence mode="wait">
        {view === 'home' ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex-1 flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-50 to-slate-100"
          >
            <div className="max-w-4xl w-full text-center space-y-12">
              <div className="space-y-4">
                <motion.h1 
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="text-5xl md:text-6xl font-black text-slate-900 tracking-tight"
                >
                  THUẬT TOÁN TÌM KIẾM
                </motion.h1>
                <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                  Khám phá và trực quan hóa các thuật toán tìm kiếm cơ bản trong khoa học máy tính.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { 
                    id: 'linear', 
                    title: 'Tìm kiếm Tuyến tính', 
                    desc: 'Duyệt qua từng phần tử trong danh sách.', 
                    icon: <List className="w-8 h-8" />,
                    color: 'bg-blue-600',
                    hover: 'hover:border-blue-400'
                  },
                  { 
                    id: 'binary', 
                    title: 'Tìm kiếm Nhị phân', 
                    desc: 'Tìm kiếm trên mảng đã sắp xếp bằng cách chia đôi.', 
                    icon: <Search className="w-8 h-8" />,
                    color: 'bg-indigo-600',
                    hover: 'hover:border-indigo-400'
                  },
                  { 
                    id: 'bst', 
                    title: 'Cây Tìm kiếm Nhị phân', 
                    desc: 'Cấu trúc dữ liệu cây giúp tìm kiếm cực nhanh.', 
                    icon: <GitBranch className="w-8 h-8" />,
                    color: 'bg-emerald-600',
                    hover: 'hover:border-emerald-400'
                  }
                ].map((item) => (
                  <motion.button
                    key={item.id}
                    whileHover={{ y: -8, scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => switchAlgorithm(item.id as Algorithm)}
                    className={`bg-white p-8 rounded-3xl shadow-xl border-2 border-transparent transition-all text-left flex flex-col gap-6 ${item.hover}`}
                  >
                    <div className={`${item.color} w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-lg`}>
                      {item.icon}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                      <p className="text-slate-500 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                    <div className="mt-auto flex items-center text-sm font-bold text-slate-400 group-hover:text-slate-600">
                      Bắt đầu khám phá <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="visualizer"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex flex-col"
          >
            {/* Header */}
            <header className="bg-white border-b border-[#E2E8F0] py-3 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setView('home')}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500 hover:text-slate-900 flex items-center gap-2 font-bold text-sm"
                >
                  <Layout className="w-5 h-5" />
                  <span className="hidden md:inline">Trang chủ</span>
                </button>
                <div className="h-6 w-px bg-slate-200 mx-1" />
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg text-white ${algorithm === 'linear' ? 'bg-blue-600' : algorithm === 'binary' ? 'bg-indigo-600' : algorithm.startsWith('bst') ? 'bg-emerald-600' : 'bg-orange-600'}`}>
                    {algorithm === 'linear' ? <List className="w-5 h-5" /> : algorithm === 'binary' ? <Search className="w-5 h-5" /> : algorithm.startsWith('bst') ? <GitBranch className="w-5 h-5" /> : <Search className="w-5 h-5" />}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-[#0F172A] tracking-tight leading-none">
                      {algorithm === 'linear' ? 'Tìm kiếm Tuyến tính' : algorithm === 'binary' ? 'Tìm kiếm Nhị phân' : 'Cây Tìm kiếm Nhị phân'}
                    </h1>
                <p className="text-[#64748B] text-[10px] mt-1">
                  {algorithm === 'linear' ? 'Tìm kiếm Tuyến tính' : algorithm === 'binary' ? 'Tìm kiếm Nhị phân' : algorithm === 'bst' ? 'Dựng Cây Tìm kiếm Nhị phân' : algorithm === 'bst-insert' ? 'Thêm nút vào Cây Tìm kiếm Nhị phân' : algorithm === 'bst-delete' ? 'Xóa nút khỏi Cây Tìm kiếm Nhị phân' : 'Tìm kiếm trên Cây Tìm kiếm Nhị phân'}
                </p>
                  </div>
                </div>
              </div>

              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button onClick={() => switchAlgorithm('linear')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${algorithm === 'linear' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}>Tuyến tính</button>
                <button onClick={() => switchAlgorithm('binary')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${algorithm === 'binary' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>Nhị phân</button>
                <button onClick={() => switchAlgorithm('bst')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${algorithm === 'bst' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Dựng BST</button>
                <button onClick={() => switchAlgorithm('bst-insert')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${algorithm === 'bst-insert' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-500 hover:text-slate-700'}`}>Thêm nút</button>
                <button onClick={() => switchAlgorithm('bst-delete')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${algorithm === 'bst-delete' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:text-slate-700'}`}>Xóa nút</button>
                <button onClick={() => switchAlgorithm('bst-search')} className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${algorithm === 'bst-search' ? 'bg-white shadow-sm text-orange-600' : 'text-slate-500 hover:text-slate-700'}`}>Tìm BST</button>
              </div>

              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${algorithm === 'linear' ? 'bg-blue-50 border-blue-100 text-blue-700' : algorithm === 'binary' ? 'bg-indigo-50 border-indigo-100 text-indigo-700' : algorithm.startsWith('bst') ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-orange-50 border-orange-100 text-orange-700'}`}>
                <span className="text-[10px] font-bold uppercase">Bước:</span>
                <span className="text-xs font-bold">{stepCount}</span>
              </div>
            </header>

            <main className="flex flex-col lg:flex-row p-4 gap-4 overflow-auto">
        {/* Left Section (Visualizer) */}
        <div className="flex-[3] flex flex-col gap-4">
          {/* Config Row */}
          <div className={`rounded-xl shadow-sm border-2 p-4 flex items-center gap-4 shrink-0 ${algorithm.startsWith('bst') ? 'bg-emerald-50/30 border-emerald-200' : 'bg-blue-50/30 border-blue-200'}`}>
            <div className="flex-1 flex items-center gap-3">
              <Edit3 className={`w-4 h-4 shrink-0 ${algorithm.startsWith('bst') ? 'text-emerald-600' : 'text-blue-600'}`} />
              <input type="text" value={arrayInput} onChange={handleArrayInputChange} disabled={isPlaying || stepCount > 0} placeholder="Dãy số..." className={`flex-1 bg-white border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 disabled:opacity-50 ${algorithm.startsWith('bst') ? 'border-emerald-200 focus:ring-emerald-500' : 'border-blue-200 focus:ring-blue-500'}`} />
              <button onClick={applyCustomArray} disabled={isPlaying || stepCount > 0} className={`text-white px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 ${algorithm.startsWith('bst') ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'}`}>Áp dụng</button>
              <button onClick={generateRandomArray} disabled={isPlaying || stepCount > 0} className={`p-1.5 rounded-lg transition-colors disabled:opacity-50 ${algorithm.startsWith('bst') ? 'text-emerald-600 hover:bg-emerald-100' : 'text-blue-600 hover:bg-blue-100'}`}><Dices className="w-5 h-5" /></button>
            </div>
            {(algorithm === 'bst' || algorithm === 'bst-insert' || algorithm === 'bst-delete' || algorithm === 'linear' || algorithm === 'binary') && (
              <div className="flex items-center gap-3">
                <Target className={`w-4 h-4 shrink-0 ${algorithm === 'bst-delete' ? 'text-red-600' : algorithm.startsWith('bst') ? 'text-emerald-600' : 'text-blue-600'}`} />
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${algorithm === 'bst-delete' ? 'text-red-600' : algorithm.startsWith('bst') ? 'text-emerald-600' : 'text-blue-600'}`}>
                    {algorithm === 'bst' ? 'Thêm:' : algorithm === 'bst-delete' ? 'Xóa:' : 'X ='}
                  </span>
                  <input type="number" value={targetInput} onChange={handleTargetChange} disabled={isPlaying || (algorithm !== 'bst' && algorithm !== 'bst-insert' && algorithm !== 'bst-delete' && stepCount > 0)} className={`w-12 bg-transparent text-sm font-bold focus:outline-none border-b-2 disabled:opacity-50 ${algorithm === 'bst-delete' ? 'text-red-900 border-red-500' : algorithm.startsWith('bst') ? 'text-emerald-900 border-emerald-500' : 'text-blue-900 border-blue-500'}`} />
                  {algorithm === 'bst' && (
                    <button onClick={handleAddBSTNode} disabled={isPlaying} className="bg-emerald-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-emerald-700 disabled:opacity-50">Thêm</button>
                  )}
                  {algorithm === 'bst-delete' && (
                    <button onClick={() => setIsPlaying(true)} disabled={isPlaying || isFinished} className="bg-red-600 text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-red-700 disabled:opacity-50">Xóa</button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Main Visualizer Area - Increased minimum height */}
          <div className={`min-h-[900px] rounded-xl shadow-sm border-2 p-6 flex flex-col items-center relative ${algorithm.startsWith('bst') ? 'bg-emerald-50/30 border-emerald-200' : 'bg-indigo-50/30 border-indigo-200'}`}>
            
            {/* 1. Dãy số phía trên cùng - Chỉ hiển thị cho các thuật toán BST */}
            {algorithm.startsWith('bst') && (
              <div className="w-full flex justify-center gap-2 py-4 border-b border-orange-100 bg-white/30 rounded-t-xl shrink-0">
                {array.map((v, i) => (
                  <div key={i} className={`px-4 py-2 rounded-lg font-extrabold text-xl transition-all shadow-sm ${
                    algorithm.startsWith('bst') 
                      ? (algorithm === 'bst' && i === bstSequenceIndex ? 'bg-orange-600 text-black scale-110 shadow-md ring-2 ring-orange-400' : (algorithm === 'bst' && i < bstSequenceIndex) ? 'bg-orange-200 text-black/40' : 'bg-orange-400 text-black border border-orange-500')
                      : (algorithm === 'linear' 
                          ? (i === currentIndex ? 'bg-orange-600 text-black scale-110 shadow-md ring-2 ring-orange-400' : foundIndices.includes(i) ? 'bg-green-500 text-black' : 'bg-orange-400 text-black border border-orange-500')
                          : (i === mid ? 'bg-orange-600 text-black scale-110 shadow-md ring-2 ring-orange-400' : (left !== -1 && (i < left || i > right)) ? 'bg-slate-100 text-slate-400' : 'bg-orange-400 text-black border border-orange-500'))
                  }`}>
                    {v}
                  </div>
                ))}
              </div>
            )}

            {/* 2. Giải thích ở vị trí thứ 2 */}
            <div className="w-full max-w-2xl mt-6 shrink-0 z-20">
              <AnimatePresence mode="wait">
                <motion.div 
                  key={message + isFinished} 
                  initial={{ opacity: 0, y: -10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className={`p-5 rounded-xl border-2 flex items-center gap-4 shadow-lg ${
                    isFinished 
                      ? (foundIndices.length > 0 || algorithm.startsWith('bst') ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800') 
                      : 'bg-white border-indigo-100 text-indigo-900'
                  }`}
                >
                  {isFinished ? <CheckCircle2 className="w-10 h-10 shrink-0" /> : <Info className={`w-10 h-10 shrink-0 ${algorithm.startsWith('bst') ? 'text-emerald-500' : 'text-indigo-500'}`} />}
                  <p className="text-2xl font-bold leading-tight">{message}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* 3. Cây / Dãy mô phỏng được dựng ở cuối */}
            <div className="flex-1 w-full mt-8 relative flex items-start justify-center" ref={containerRef}>
              {algorithm.startsWith('bst') ? (
                <div className="w-full h-full relative min-h-[600px]">
                  <svg className="w-full h-full pointer-events-none absolute inset-0">
                    {edges.map(edge => (
                      <motion.line 
                        key={edge.id}
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        x1={edge.x1} y1={edge.y1} 
                        x2={edge.x2} y2={edge.y2} 
                        stroke="#475569" strokeWidth="2" strokeLinecap="round"
                      />
                    ))}
                  </svg>
                  {bstNodes.map(node => (
                    <motion.div 
                      key={`node-${node.id}`} 
                      ref={(el) => {
                        if (el) nodeRefs.current.set(node.id, el);
                        else nodeRefs.current.delete(node.id);
                      }}
                      initial={{ scale: 0 }} 
                      animate={{ 
                        scale: 1, 
                        backgroundColor: (algorithm === 'bst-search' && foundIndices.includes(node.id)) ? '#22C55E' : bstTraversingId === node.id ? '#F59E0B' : '#3B82F6', 
                        borderColor: (algorithm === 'bst-search' && foundIndices.includes(node.id)) ? '#16A34A' : bstTraversingId === node.id ? '#D97706' : '#1D4ED8' 
                      }} 
                      style={{ 
                        left: `${node.x}%`, 
                        top: `${node.y}%`, 
                        transform: 'translate(-50%, -50%)',
                        background: (algorithm === 'bst-search' && foundIndices.includes(node.id)) ? undefined : bstTraversingId === node.id ? undefined : 'linear-gradient(to bottom, #60A5FA, #2563EB)'
                      }} 
                      className="absolute w-14 h-14 rounded-full border-2 flex items-center justify-center text-white font-extrabold text-2xl shadow-lg z-10"
                    >
                      {node.value}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-6 mt-10">
                  {array.map((val, idx) => {
                    const isCurrent = algorithm === 'linear' ? idx === currentIndex : idx === mid;
                    const isFound = foundIndices.includes(idx);
                    const isOutOfRange = algorithm === 'binary' && left !== -1 && (idx < left || idx > right);
                    return (
                      <div key={idx} className="flex flex-col items-center gap-3 relative">
                        <motion.div 
                          animate={{ 
                            scale: isCurrent ? 1.2 : 1, 
                            backgroundColor: isFound ? '#22C55E' : isCurrent ? (algorithm === 'linear' ? '#EF4444' : '#F59E0B') : isOutOfRange ? '#E2E8F0' : '#1E3A8A', 
                            color: isOutOfRange ? '#94A3B8' : '#FFFFFF', 
                            opacity: isOutOfRange ? 0.5 : 1 
                          }} 
                          className="w-16 h-16 flex items-center justify-center rounded-2xl border-4 border-transparent text-2xl font-bold shadow-lg relative"
                        >
                          {val}
                        </motion.div>
                        <span className={`text-sm font-mono font-bold ${isCurrent ? (algorithm === 'linear' ? 'text-[#EF4444]' : 'text-amber-600') : 'text-indigo-400'}`}>Index: {idx}</span>
                        {isCurrent && (
                          <motion.div layoutId="pointer" className={`absolute -bottom-8 ${algorithm === 'linear' ? 'text-[#EF4444]' : 'text-amber-500'}`}>
                            {algorithm === 'linear' ? <ChevronRight className="w-8 h-8 rotate-90" /> : <ArrowDown className="w-8 h-8" />}
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Section (Controls & Code) - Sticky Sidebar */}
        <div className="flex-1 flex flex-col gap-4">
          <div className="sticky top-24 flex flex-col gap-4">
            {/* Controls Card */}
            <div className="bg-amber-50/30 rounded-xl shadow-sm border-2 border-amber-200 p-5 shrink-0">
              <h2 className="text-xs font-bold text-amber-600 uppercase tracking-widest mb-4">Điều khiển</h2>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <button onClick={() => setIsPlaying(!isPlaying)} disabled={isFinished} className={`flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-base transition-all ${isPlaying ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200' : 'bg-slate-800 text-white hover:bg-slate-900'} disabled:opacity-50`}>{isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}{isPlaying ? 'Tạm dừng' : 'Bắt đầu'}</button>
                  <button onClick={reset} className="flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-base bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"><RotateCcw className="w-5 h-5" /> Chạy lại</button>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center"><span className="text-xs font-bold text-amber-700 uppercase">Tốc độ: {(speed / 1000).toFixed(1)}s</span></div>
                  <input type="range" min="500" max="5000" step="500" value={speed} onChange={(e) => setSpeed(parseInt(e.target.value))} className="w-full h-2 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                </div>
              </div>
            </div>

            {/* Pseudocode Card */}
            <div className="bg-[#1E293B] rounded-xl shadow-xl border-2 border-slate-700 p-5 text-white flex flex-col min-h-[400px]">
              <h2 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-widest mb-4 shrink-0">Mã giả ({algorithm.toUpperCase()})</h2>
              <div className="font-mono text-[11px] space-y-1 overflow-y-auto flex-1">
                {algorithm === 'linear' ? (
                  <>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 0 ? 'bg-[#334155] text-blue-400 border-l-2 border-blue-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">01</span>for i = 0 → n-1</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 1 ? 'bg-[#334155] text-red-400 border-l-2 border-red-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">02</span>&nbsp;&nbsp;nếu A[i] == X</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-green-400 border-l-2 border-green-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">03</span>&nbsp;&nbsp;&nbsp;&nbsp;thông báo tìm thấy</div>
                  </>
                ) : algorithm === 'binary' ? (
                  <>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 0 ? 'bg-[#334155] text-blue-400 border-l-2 border-blue-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">01</span>while left ≤ right:</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 1 ? 'bg-[#334155] text-amber-400 border-l-2 border-amber-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">02</span>&nbsp;&nbsp;mid = (left + right) / 2</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-green-400 border-l-2 border-green-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">03</span>&nbsp;&nbsp;if A[mid] == X: return mid</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 3 ? 'bg-[#334155] text-blue-300 border-l-2 border-blue-300' : 'text-slate-400'}`}><span className="opacity-30 mr-2">04</span>&nbsp;&nbsp;else if A[mid] &lt; X: left = mid + 1</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 4 ? 'bg-[#334155] text-red-300 border-l-2 border-red-300' : 'text-slate-400'}`}><span className="opacity-30 mr-2">05</span>&nbsp;&nbsp;else: right = mid - 1</div>
                  </>
                ) : algorithm === 'bst' ? (
                  <>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 0 ? 'bg-[#334155] text-blue-400 border-l-2 border-blue-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">01</span>if root is null: insert root</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 1 ? 'bg-[#334155] text-amber-400 border-l-2 border-amber-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">02</span>while current is not null:</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-blue-300 border-l-2 border-blue-300' : 'text-slate-400'}`}><span className="opacity-30 mr-2">03</span>&nbsp;&nbsp;if val &lt; current: go left</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 4 ? 'bg-[#334155] text-red-300 border-l-2 border-red-300' : 'text-slate-400'}`}><span className="opacity-30 mr-2">04</span>&nbsp;&nbsp;else: go right</div>
                  </>
                ) : algorithm === 'bst-delete' ? (
                  <>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 0 ? 'bg-[#334155] text-blue-400 border-l-2 border-blue-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">01</span>find node with value X</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-red-400 border-l-2 border-red-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">02</span>if node is leaf: remove it</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-amber-400 border-l-2 border-amber-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">03</span>else if 1 child: link child to parent</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-green-400 border-l-2 border-green-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">04</span>else: replace with inorder successor</div>
                  </>
                ) : (
                  <>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 0 ? 'bg-[#334155] text-blue-400 border-l-2 border-blue-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">01</span>current = root</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 1 ? 'bg-[#334155] text-amber-400 border-l-2 border-amber-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">02</span>while current is not null:</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 2 ? 'bg-[#334155] text-green-400 border-l-2 border-green-400' : 'text-slate-400'}`}><span className="opacity-30 mr-2">03</span>&nbsp;&nbsp;if X == current.val: return found</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 3 ? 'bg-[#334155] text-blue-300 border-l-2 border-blue-300' : 'text-slate-400'}`}><span className="opacity-30 mr-2">04</span>&nbsp;&nbsp;else if X &lt; current.val: go left</div>
                    <div className={`p-1.5 rounded transition-colors ${activeCodeLine === 4 ? 'bg-[#334155] text-red-300 border-l-2 border-red-300' : 'text-slate-400'}`}><span className="opacity-30 mr-2">05</span>&nbsp;&nbsp;else: go right</div>
                  </>
                )}
              </div>
              <div className="mt-auto pt-3 border-t border-slate-700 shrink-0">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Ghi chú</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {algorithm === 'linear' ? 'Duyệt tuần tự. O(n).' : algorithm === 'binary' ? 'Dãy đã sắp xếp. O(log n).' : 'Cây Tìm kiếm Nhị phân. O(h).'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
          </motion.div>
        )}
      </AnimatePresence>
      <footer className="bg-white border-t border-[#E2E8F0] py-4 px-6 text-center shrink-0 mt-auto">
        <p className="text-[10px] text-[#94A3B8] font-medium uppercase tracking-widest">&copy; 2026 Algorithms Visualizer Suite</p>
      </footer>
    </div>
  );
}
