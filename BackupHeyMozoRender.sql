PGDMP  %                    }            general_fn23    16.6 (Debian 16.6-1.pgdg120+1)    16.2 .    L           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            M           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            N           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            O           1262    16389    general_fn23    DATABASE     w   CREATE DATABASE general_fn23 WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF8';
    DROP DATABASE general_fn23;
                admin    false            P           0    0    general_fn23    DATABASE PROPERTIES     5   ALTER DATABASE general_fn23 SET "TimeZone" TO 'utc';
                     admin    false                        2615    2200    public    SCHEMA        CREATE SCHEMA public;
    DROP SCHEMA public;
                admin    false            Q           0    0    SCHEMA public    COMMENT     6   COMMENT ON SCHEMA public IS 'standard public schema';
                   admin    false    5            �            1259    16409    Branches    TABLE     �  CREATE TABLE public."Branches" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "companyId" integer NOT NULL,
    website character varying(255),
    menu character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    logo character varying(255),
    "textColor" character varying(255),
    "fontFamily" character varying(255),
    "qrBackgroundImage" character varying(255),
    "tableIds" json DEFAULT '[]'::json
);
    DROP TABLE public."Branches";
       public         heap    admin    false    5            �            1259    16408    Branches_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Branches_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 (   DROP SEQUENCE public."Branches_id_seq";
       public          admin    false    218    5            R           0    0    Branches_id_seq    SEQUENCE OWNED BY     G   ALTER SEQUENCE public."Branches_id_seq" OWNED BY public."Branches".id;
          public          admin    false    217            �            1259    16400 	   Companies    TABLE     ;  CREATE TABLE public."Companies" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    website character varying(255),
    menu character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "branchIds" json DEFAULT '[]'::json
);
    DROP TABLE public."Companies";
       public         heap    admin    false    5            �            1259    16399    Companies_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Companies_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public."Companies_id_seq";
       public          admin    false    5    216            S           0    0    Companies_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public."Companies_id_seq" OWNED BY public."Companies".id;
          public          admin    false    215            �            1259    16437    Events    TABLE     5  CREATE TABLE public."Events" (
    id integer NOT NULL,
    "tableId" integer NOT NULL,
    type character varying(255) NOT NULL,
    message character varying(255),
    "seenAt" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);
    DROP TABLE public."Events";
       public         heap    admin    false    5            �            1259    16436    Events_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Events_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public."Events_id_seq";
       public          admin    false    5    222            T           0    0    Events_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public."Events_id_seq" OWNED BY public."Events".id;
          public          admin    false    221            �            1259    16563    MailingLists    TABLE       CREATE TABLE public."MailingLists" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    message text,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone NOT NULL
);
 "   DROP TABLE public."MailingLists";
       public         heap    admin    false    5            �            1259    16562    MailingLists_id_seq    SEQUENCE     �   CREATE SEQUENCE public."MailingLists_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 ,   DROP SEQUENCE public."MailingLists_id_seq";
       public          admin    false    224    5            U           0    0    MailingLists_id_seq    SEQUENCE OWNED BY     O   ALTER SEQUENCE public."MailingLists_id_seq" OWNED BY public."MailingLists".id;
          public          admin    false    223            �            1259    16423    Tables    TABLE     !  CREATE TABLE public."Tables" (
    id integer NOT NULL,
    "tableName" character varying(255) NOT NULL,
    "branchId" integer NOT NULL,
    "tableDescription" character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);
    DROP TABLE public."Tables";
       public         heap    admin    false    5            �            1259    16422    Tables_id_seq    SEQUENCE     �   CREATE SEQUENCE public."Tables_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public."Tables_id_seq";
       public          admin    false    220    5            V           0    0    Tables_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public."Tables_id_seq" OWNED BY public."Tables".id;
          public          admin    false    219            �           2604    16412    Branches id    DEFAULT     n   ALTER TABLE ONLY public."Branches" ALTER COLUMN id SET DEFAULT nextval('public."Branches_id_seq"'::regclass);
 <   ALTER TABLE public."Branches" ALTER COLUMN id DROP DEFAULT;
       public          admin    false    218    217    218            �           2604    16403    Companies id    DEFAULT     p   ALTER TABLE ONLY public."Companies" ALTER COLUMN id SET DEFAULT nextval('public."Companies_id_seq"'::regclass);
 =   ALTER TABLE public."Companies" ALTER COLUMN id DROP DEFAULT;
       public          admin    false    216    215    216            �           2604    16440 	   Events id    DEFAULT     j   ALTER TABLE ONLY public."Events" ALTER COLUMN id SET DEFAULT nextval('public."Events_id_seq"'::regclass);
 :   ALTER TABLE public."Events" ALTER COLUMN id DROP DEFAULT;
       public          admin    false    221    222    222            �           2604    16566    MailingLists id    DEFAULT     v   ALTER TABLE ONLY public."MailingLists" ALTER COLUMN id SET DEFAULT nextval('public."MailingLists_id_seq"'::regclass);
 @   ALTER TABLE public."MailingLists" ALTER COLUMN id DROP DEFAULT;
       public          admin    false    223    224    224            �           2604    16426 	   Tables id    DEFAULT     j   ALTER TABLE ONLY public."Tables" ALTER COLUMN id SET DEFAULT nextval('public."Tables_id_seq"'::regclass);
 :   ALTER TABLE public."Tables" ALTER COLUMN id DROP DEFAULT;
       public          admin    false    220    219    220            C          0    16409    Branches 
   TABLE DATA           �   COPY public."Branches" (id, name, "companyId", website, menu, "createdAt", "updatedAt", logo, "textColor", "fontFamily", "qrBackgroundImage", "tableIds") FROM stdin;
    public          admin    false    218   �5       A          0    16400 	   Companies 
   TABLE DATA           e   COPY public."Companies" (id, name, website, menu, "createdAt", "updatedAt", "branchIds") FROM stdin;
    public          admin    false    216   Y7       G          0    16437    Events 
   TABLE DATA           d   COPY public."Events" (id, "tableId", type, message, "seenAt", "createdAt", "updatedAt") FROM stdin;
    public          admin    false    222   t8       I          0    16563    MailingLists 
   TABLE DATA           \   COPY public."MailingLists" (id, name, email, message, "createdAt", "updatedAt") FROM stdin;
    public          admin    false    224   �L       E          0    16423    Tables 
   TABLE DATA           m   COPY public."Tables" (id, "tableName", "branchId", "tableDescription", "createdAt", "updatedAt") FROM stdin;
    public          admin    false    220   eM       W           0    0    Branches_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public."Branches_id_seq"', 4, true);
          public          admin    false    217            X           0    0    Companies_id_seq    SEQUENCE SET     @   SELECT pg_catalog.setval('public."Companies_id_seq"', 2, true);
          public          admin    false    215            Y           0    0    Events_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public."Events_id_seq"', 579, true);
          public          admin    false    221            Z           0    0    MailingLists_id_seq    SEQUENCE SET     C   SELECT pg_catalog.setval('public."MailingLists_id_seq"', 1, true);
          public          admin    false    223            [           0    0    Tables_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public."Tables_id_seq"', 72, true);
          public          admin    false    219            �           2606    16416    Branches Branches_pkey 
   CONSTRAINT     X   ALTER TABLE ONLY public."Branches"
    ADD CONSTRAINT "Branches_pkey" PRIMARY KEY (id);
 D   ALTER TABLE ONLY public."Branches" DROP CONSTRAINT "Branches_pkey";
       public            admin    false    218            �           2606    16407    Companies Companies_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public."Companies"
    ADD CONSTRAINT "Companies_pkey" PRIMARY KEY (id);
 F   ALTER TABLE ONLY public."Companies" DROP CONSTRAINT "Companies_pkey";
       public            admin    false    216            �           2606    16444    Events Events_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public."Events"
    ADD CONSTRAINT "Events_pkey" PRIMARY KEY (id);
 @   ALTER TABLE ONLY public."Events" DROP CONSTRAINT "Events_pkey";
       public            admin    false    222            �           2606    16572 #   MailingLists MailingLists_email_key 
   CONSTRAINT     c   ALTER TABLE ONLY public."MailingLists"
    ADD CONSTRAINT "MailingLists_email_key" UNIQUE (email);
 Q   ALTER TABLE ONLY public."MailingLists" DROP CONSTRAINT "MailingLists_email_key";
       public            admin    false    224            �           2606    16570    MailingLists MailingLists_pkey 
   CONSTRAINT     `   ALTER TABLE ONLY public."MailingLists"
    ADD CONSTRAINT "MailingLists_pkey" PRIMARY KEY (id);
 L   ALTER TABLE ONLY public."MailingLists" DROP CONSTRAINT "MailingLists_pkey";
       public            admin    false    224            �           2606    16430    Tables Tables_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public."Tables"
    ADD CONSTRAINT "Tables_pkey" PRIMARY KEY (id);
 @   ALTER TABLE ONLY public."Tables" DROP CONSTRAINT "Tables_pkey";
       public            admin    false    220            �           2606    16545     Branches Branches_companyId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Branches"
    ADD CONSTRAINT "Branches_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES public."Companies"(id) ON UPDATE CASCADE ON DELETE CASCADE;
 N   ALTER TABLE ONLY public."Branches" DROP CONSTRAINT "Branches_companyId_fkey";
       public          admin    false    3235    218    216            �           2606    16557    Events Events_tableId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Events"
    ADD CONSTRAINT "Events_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES public."Tables"(id) ON UPDATE CASCADE ON DELETE CASCADE;
 H   ALTER TABLE ONLY public."Events" DROP CONSTRAINT "Events_tableId_fkey";
       public          admin    false    220    3239    222            �           2606    16552    Tables Tables_branchId_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public."Tables"
    ADD CONSTRAINT "Tables_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES public."Branches"(id) ON UPDATE CASCADE ON DELETE CASCADE;
 I   ALTER TABLE ONLY public."Tables" DROP CONSTRAINT "Tables_branchId_fkey";
       public          admin    false    3237    220    218            C   �  x���]k�0���_��;�:qb��`�i���c-AN�Ď2YJ��������� �ޗ����ԯ�md��YF�W�8��;Մ����r�4X��;4i�����p�r+�*�˗�{r0������̍w��E�È�����S�S�Ĕ���-z_��SG\@��:�o�Z�j�����������9js����A�����dx�	h �Z��^��������^
�52����*7'�r�I^��rF���,�_��>o��x,���M��|g1��^�z4~��qVڗ��?ܢ�͜���W�#���^��u1�����~q�!e)�EL����A ��XX�l � ��9p��!ƀ'��� � ڣ���v�e��H@�A 	 d�P ��z��S�1�t:?��đ      A     x���Ak�0 ���+�5I�Pa+:��k��V$�ԈZ���ׯ����n��=x|Hz�� =''A;��yC��q$&�gg�z�s��IeS>�����78^���jGN��$VR!R�i۸�L��z��Pr�(����h%r-�q�ڡmn�uy��(��j�>�C]����Ȋ�%pW[�qH�)���}Yx(�y����8V�R�b��}��G%��ܮ���H	mRk�_���T#^V�/�pZ��?E��FHC��½��ɲ��Zq      G      x��]͒#Ǎ>�<�����zG�
�Z[��"�4W��̴�����q��/��B�"��X��tD|�Y� ���l���o~�������?�z�}�ug��R�W�m��*�������R7�R�+grg�Hٹ��S���^I#��̪0F!�W�[�Dr�K�"D
��+�)����5�x���V�&��[����9�����x��^�\�`��2���n]쵺�7��/@߾������O[����q5C=�z�z�����50�z���*��Jc�_~�#Γ[p�)�ߔ5�>�t�35�"7�
�:���
Ͼ_����D�
̻n�]�&��X�N-�}�����A������e�jLQ��~��ݗ߽���-1��N�F��U����<PH��V㋚�Q~�����q������~�����6yy�/1,#t��0�`�*DocQH��V�������7����o�����y�������n��qw��q�����y~ڽ}~�������ϻ���ͧ����	fBCP��-ܰ��D���j��k
���	u�����j�W���[2b��Bj�j|Q�\E�6�+��Q��
Ӡ0��(I5��9��6�qY�/��'��u���c��EJN �F5��Lk3E۹�x�����=؇���؍O����Ä]�Q��l{�A| ���:�wnNE#����w/���O�~ڼ۽�����y#8S��_�!b�f���o�!:�c��WV�������He���!�;5�"C�A|m��T�%ћ԰F��Թ��Gg���a'���tǮD�<O�����<w�����O���|�|S����Z&l�7�t�����}�{��u ; �Mi�Y7�>C�δ��,�L9"��
1\�K���LMp�Ļ��Cc˽���:;y8����O��()"��
�$���|�W�bo35u�tV��B�=�����sj�i���֜� ^�̵�̛�΀�3Ir%��l$��[l rq+�BgŶ �I�#���R��a�&�� ����)�v������Q}J���Y��֗d�<ܬ��$abR���^D�q���j�4K��*��L~�<K{(�s�'"	�ъ�a�؈���b7�)�@��b���L�\&�C����PV��F��59��;'�D 4���4�0�W��ʶs�xp\�8}"��˘�]4$�'J�< ;�"��4���Kn��#P��È���F�:/�t �abE_!~oX�+=��+��x#�^)j�ie;/�JN��9�r�C�$R�D1�� |���Vp�V��)�: A�<����5��h~}m�- ���k��̪�L&�M ��l���)0{�jķ/?�$�}��n���0?���?�2�L�?�6��a'�Yq5��LXe��D�T8@�N���0�5p�������ڵQ�_u�Yu��4ϑ�3�N���B�W�xʃ[S�6���ڬ��;r&�B1	8k|��]��l���̮��Dn0� d��H�[7�t��x����C��#?�Ax6]ӓ�χ(�<Q1���rc,Ul���+�sD�@��+�Ȕ����d?�'�#y\�:	/@@��$=�r΅��)�T�ԧ'��W�O.5���c��V�yD�;�����ڔ���uCBչC��"���������tj���QN��f�Wln��'
��t����pr�ж���DӍc��K�L$\�S�}@҈��󹳇�X�ٔ�(��pq0|�i>��F�<���EB�|�	?���|����\	������C�T�� ��@�ԓ%4E!̦W��S�H$��s����r.��Hݧ\ 	M��j�EB������c��K�\$4E��g܈���y�j]c�_���v�q>�F$A9��Ty�_��"��Hj>�����<��%z.n�$(�s�p�'A����qQ��H���_9g"��L
�� \$ܹ)o߼i䖵.Lv�hQ�@���S*��:8�7*�u���i��O?�����Mo[��s������ޚ�nt��A���)ˆ�*��5m����%��0o�����`�����7(�[�z�[�Y������I3�͌��I�Qx�,4	���e&��?�v_�tX��N~u�p�3��QT���%Hp���R� �~�ĩ#H`0��6`���r8W��K��c�9M�.��}�XU�'�q�EA���M�5W�)�H��Kj���pn�����SxCt�'�v���s��`o�8g	�`���|�ۆ�E�@A�5է�l�2W��ⴇ_��SmG`����*R"NLr�:y��y�%U�i���N-��v���o����w� ���f�����P�ry(Y���"���`��]`�
G8�z%��r�.�m�n��E8W"f����*��/����s�x5���ӅhT�s�
.�s�F;N5F��pk�T�S�*+ǿ�_���'��S������2��������q��P��`<^��h��olHA���^ ^��B$����M�E�(��b�ڒQ�{�X�"�'r�4�H��ˑ�۹��L�<*ѵ��=�d�H�0�iQ�yX�f�� {A�9�0��b&(C^o����*֩�⟃�co�%�V��Q~��R(�qO����������Q�d�-�?=?�o�e;h�EJ�"��2r~��1���1���=$8x5�S���`�rs����q�㔌�AL�>(��\
�f'���%N�i�`�g��K�9��4�n�`��g�`g�Q$��d{�����<U�^ ��� Q�]�I�gw8�F�:�1jk���iT^B�+�%?J}��*�^�k	�C�a3��}a~�YR��G�����t��S�}42U�Lo_Ρ�J2��0D��;����.��!�Y<�����T�N�ī:�ގ�	�����dN�V\H0�����!`Ip��5`�mHxx[D#`���+"��g��x��\�,���W!8"���v!}`� �z}*N�#A�K(.i��" �s�R�ܞ� �cʚs{J��Cʬ�S"�Z)mD��LQU��I����������o���KW�>?q�JŁR�z#��\���M�Wq�܈��i�fմ[�B(�aQ�I�h���������7_4B�����|�P���d��X2��z���du�m9��$1I�^e�M�21�sFcY�}�rO����~X�21����G?�������x	�M�����K����������p_�����"\؞Ea�v�w,��	�r�d�8A����P>&WZ���2�«�-�(D�̧d8�d�pE�0�d�0�4K�͵c�GN5S��W�|i}��ϤD�Sv"$W9V�E�c|��'q���T�Ht���t$�D��p�2�2�6��?X"_�5�"�.�DQ8@B;���rH��2$�ѳ"pR}�1����S�i9��"���0�Y�dHQ&�J����Y�2R�|�#i�heZ��T}�,Ҡ�/�_��J�"�:&Ϻ` BB��{GB��."��ZϔX�}Z��j B��w�O T������f��.6��@6w��2u�a9$ǺH���yVEO��N����]�G���k���wJ,.���[V_��,�9$p��Y�Ĳ �G$����eQ�EH�J���_���Vy�m	���_��"EVE^��}��nz�}�U�ח���ՊN����^����:5��:K�pD�N�ʀ��sG�ʕ��֌7)�C⭙�����5��z����>X��V3�1}�Q5R�^N9ل���O���B �խe��C��TZIS>!$Cg��H]�,��0����}I���[Of��@��m�3RR$�6��R���B6_w;�Y6!���s���HǄ�1.�H���靅�d���\|9$�![����\�\���H��Bbd�Hh^��b�X�g<�'D�F�t�XyL5oP=���>qIj��Ѯ�1O߰1.*=�����b���ʕ�4�8i�-��@VL�ʮ��[w%۷�ԥJ	v��d|d'����@�/�D�9e?n/s n  �U=y{�Z���������6h6&���1�*W괆����������p\�k����Nl.��Z]���"T��4�9���15��(J�v��4�R����>9GQe�D}�6Fo}*�'e�u*�[�]���B$O���q����^�̜fB"gV��P�����<
��/s��i"��v̕��W�֛4TC��F9sn˼ڙRYw��j`�5��b����~�������~���������������þ߿�P�l�?���DnM�q���aP����c��I ;}a��DV�n$��р��T��g�	�����>��y�C�P�L���A������]�S=�t�qËJ~�(詨�O�/kN4�=������湶40Z��z�.m/t���
-��'�B[]�]���sZh�\`e�+�c|2X=��������!��ⱻ�R֝���� f4!��d]�M}��R'o�T"��Um�����W���)=�/.>E��i��ح.��"%����I��%Hg�*��L�E�=�������������Q���14�Kjn(Ҥ��<���Rg(���$Ƶ�������9{x���O8����X*�f��OU{��0���)�g�iD]U�kz!O�ϵ��ǋ���F�!��O�]�F	� DV�|�`j�ycЕ[�ip�$Hk�Py��vL��wR �`z���R<�'��ʛٍ�1Dhf��++��1Y�#rCT�f$�����cj۫<ׂ�66������0p��|X[RC��.�}��đ%>��fҼy]B��/��QT�D�[��`�K�����_�7���vE�Uz��,�g�-�PYF�eHB�4L��ANbܤHh�*p�"�͆��[�A_�"��ˆ�hI��D�-��Z��ZN��t�̸F��q�	��`�	��͜�a`�3M;�"a�Fѷ��4GK���-eH��p��d���͜�"!#Gy�&C��)�}�"a
WE�&D���Jt�@
��b���J�	��Vt:K���Vk�J'E��Tn��k^7m��BH�fTH�p�kO��H�
Ќ�eB�t�F��fO':�*EB��3�|Y��������Q2�L����իW�CvS      I   ^   x�3���M,V�L�KL��Wp����K/M��,�ϭL��,��s3s���s99��Lu�tMM�̬�,�L̴pH���b���� ��      E   �  x���Kn$7��]��>A/�;�$H�A<0�Ȧ�J��ꩇ�{��X(�{ӑ�ʰ�H�?��<�ɓ>�,�����t]V>6�]�p\����a?6~RB��>H�d�ݙ�Ka~�UR�0
�<��n��u�o�/>D��Տ�խ.������2,��u>lMau�1��qP�/+ۗ�c��R�J�H5H��x�Y���v\�>Ǆ<�	�	�@g��͘�q�;��o��6?-f���6�����խ�6/l����}���a){����MS����1Ⱦ� ñ�/۷-s�/6/�P��`N_W?8|>[��cV�o�9x��7o�M7����b���p��55����?��EyO��~rl�X�P��M˼����R�l.�Q%ۻT�����9�
u��ew9r�Q�Q��]0ةeI�aL��ׇ���h��nv��ɏ��}�\0�z�i$_`��>}��ŕ������G��#�m;f�T���1N��_3Z�}��T��-�5M�	����7�\�]	�x��,�݉hc�0$CEOi������f�އ��z�o�I�M��Yw��T�R���897rÕi�l�,�����Y��j�����J� 霵�Z���Ⱥ�lPr͛���Z"�R2�4�`�� 2���L5��*"K"�22p#3�����˟_��eh�u�Ц���Z�MDV��Z<n��ru�!��h��o�)Û�Ɛ�0���~��1�h���$�E�n;a�A�#ý����c�;��|{:y�y��h5 ��T��+u�%��գ�Wj�M��"A�Oph��8��T�֥�(H�	.�)ʴ��(����:Ms��&�' �5��錸�[�Ft��5�V����	0"����2膋�
��!�S�&<��aa��s7��ǳ���q��tJ��X] :���v2��0fx.�g�ᴭ#��Tk#cA
ݷ�z�B��B�D[��N�C��d<�Qr�b��hU�_"��Ж�LD��	o��iQ#Z��*.]6�
gB�L	:���RU�
-?��!�3�JI��\]��6���)�!~I5t[�B��M猋��1g����\�4�_F�6t[5�d����3�J$�m��A���^�Ԃ
�m%��֦V����c��W�;�┠m�R$hP�<.&���m�
@� ��B4�2��R*�1���3e��l#R�b�3�c���.[�a*���팼yV��.��
��̰��Y�O��^���V�����ū����в     